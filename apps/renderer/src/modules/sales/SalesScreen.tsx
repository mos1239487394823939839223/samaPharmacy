/**
 * فواتير المبيعات — screen 8, scoped down per this session's plan to a
 * single working till: barcode/name search, add line, adjust quantity,
 * checkout. Multi-tab invoices, the ingredient-alternatives panel, and a
 * full keyboard-only pass are deferred to a follow-up.
 *
 * Batch allocation happens server-side inside createSalesInvoice (FEFO), not
 * here — this screen only calls the API and displays what came back.
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemListRow } from '@pharmacy/shared';
import { fromPiastres, toPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { useBarcodeScanner } from '../../hardware/scanner';
import { loadScannerConfig } from '../../hardware/config';

interface CartLine {
  key: number;
  item: ItemListRow;
  unitId: number;
  unitFactor: number;
  qty: number;
  unitPrice: number;
  discountPct: number;
}

let keySeq = 1;

export function SalesScreen() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemListRow[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('cash');
  const [paidCash, setPaidCash] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      const def = list.find((w) => w.isDefault) ?? list[0];
      if (def) {
        setWarehouseId(def.id);
        setWarehouseName(def.nameAr);
      }
    });
  }, []);

  useEffect(() => searchRef.current?.focus(), []);

  async function addItemToCart(item: ItemListRow) {
    if (!window.api) return;
    const detail = await window.api.items.get(item.id);
    const unit = detail?.units.find((u) => u.isDefaultSale) ?? detail?.units[0];
    if (!unit) {
      setError(`${item.nameAr}: لا توجد وحدة بيع محددة لهذا الصنف`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id && l.unitId === unit.id);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l));
      }
      return [
        ...prev,
        {
          key: keySeq++,
          item,
          unitId: unit.id,
          unitFactor: unit.factor,
          qty: 1,
          unitPrice: unit.salePrice,
          discountPct: 0,
        },
      ];
    });
    setQuery('');
    setResults([]);
    searchRef.current?.focus();
  }

  // Scanning on the POS resolves the barcode directly and adds a line —
  // hardware doc §1.4's routing table for this screen.
  useBarcodeScanner(
    async (event) => {
      if (!window.api) return;
      const item = await window.api.items.findByBarcode(event.code);
      if (item) {
        await addItemToCart(item);
      } else {
        setError(`الباركود غير موجود: ${event.code}`);
      }
    },
    {
      config: loadScannerConfig(),
      shouldIgnore: () => {
        const el = document.activeElement as HTMLElement | null;
        return el?.tagName === 'SELECT';
      },
    }
  );

  useEffect(() => {
    if (!window.api || !query.trim()) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void window.api!.items.search(query, 10).then(setResults);
    }, 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  function updateLine(key: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: number) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  const totals = cart.reduce(
    (acc, l) => {
      const before = l.qty * l.unitPrice;
      const discount = Math.round((before * l.discountPct) / 100);
      acc.subtotal += before;
      acc.total += before - discount;
      return acc;
    },
    { subtotal: 0, total: 0 }
  );

  const change = paidCash !== null ? paidCash - totals.total : 0;

  async function checkout() {
    setError(null);
    if (!warehouseId) return setError(ar.sales.errors.noWarehouse);
    if (cart.length === 0) return setError(ar.sales.errors.noLines);
    if (invoiceType === 'cash' && (paidCash ?? 0) < totals.total) {
      return setError(ar.sales.errors.insufficientPaid);
    }
    if (!window.api) return setError(ar.status.noBridge);

    setSaving(true);
    try {
      const invoiceId = await window.api.sales.create({
        warehouseId,
        invoiceType,
        paidCash: paidCash ?? totals.total,
        lines: cart.map((l, i) => ({
          lineNo: i + 1,
          itemId: l.item.id,
          unitId: l.unitId,
          unitFactor: l.unitFactor,
          qtyInUnit: l.qty,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct,
        })),
      });

      await window.api.sales.confirm(invoiceId);
      const invoice = await window.api.sales.get(invoiceId);

      setNotice(ar.sales.confirmed.replace('{serial}', String(invoice?.serial ?? invoiceId)));
      setCart([]);
      setPaidCash(null);
      searchRef.current?.focus();
    } catch (err) {
      const message = (err as Error).message;
      setError(
        /Insufficient stock/.test(message)
          ? ar.sales.errors.outOfStock
          : `${ar.sales.errors.confirmFailed}: ${message}`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pos">
      <div className="pos__search-bar">
        <input
          ref={searchRef}
          className="field pos__search"
          placeholder={ar.sales.itemSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) void addItemToCart(results[0]);
          }}
        />
        <span className="pos__warehouse">
          {ar.sales.warehouse}: {warehouseName}
        </span>
        {results.length > 0 && (
          <ul className="autocomplete" style={{ top: '2.6rem' }}>
            {results.map((it) => (
              <li key={it.id}>
                <button type="button" onClick={() => void addItemToCart(it)}>
                  {it.nameAr}
                  {it.publicPrice !== null && (
                    <span dir="ltr" style={{ float: 'left' }}>
                      {fromPiastres(it.publicPrice)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {notice && (
        <div className="alert alert--info">
          {notice}
          <button type="button" className="alert__close" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      {cart.length === 0 ? (
        <p className="muted">{ar.sales.emptyCart}</p>
      ) : (
        <table className="datatable">
          <thead>
            <tr>
              <th>{ar.items.fields.nameAr}</th>
              <th>{ar.sales.qty}</th>
              <th>{ar.sales.unitPrice}</th>
              <th>{ar.sales.discount}</th>
              <th>{ar.sales.afterDiscount}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cart.map((l) => {
              const before = l.qty * l.unitPrice;
              const after = before - Math.round((before * l.discountPct) / 100);
              return (
                <tr key={l.key}>
                  <td>{l.item.nameAr}</td>
                  <td>
                    <input
                      className="field"
                      dir="ltr"
                      style={{ maxInlineSize: '5rem' }}
                      inputMode="decimal"
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td dir="ltr">{fromPiastres(l.unitPrice)}</td>
                  <td>
                    <input
                      className="field"
                      dir="ltr"
                      style={{ maxInlineSize: '4rem' }}
                      inputMode="decimal"
                      value={l.discountPct}
                      onChange={(e) => updateLine(l.key, { discountPct: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td dir="ltr">{fromPiastres(after)}</td>
                  <td>
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => removeLine(l.key)}>
                      {ar.sales.remove}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="pos__footer">
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.sales.invoiceType}</span>
            <select
              className="field"
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value as 'cash' | 'credit')}
            >
              <option value="cash">{ar.sales.cash}</option>
              <option value="credit">{ar.sales.credit}</option>
            </select>
          </label>
          {invoiceType === 'cash' && (
            <label className="formfield">
              <span className="formfield__label">{ar.sales.paidCash}</span>
              <input
                className="field"
                dir="ltr"
                inputMode="decimal"
                value={paidCash === null ? '' : fromPiastres(paidCash)}
                onChange={(e) => {
                  try {
                    setPaidCash(e.target.value.trim() === '' ? null : toPiastres(e.target.value));
                  } catch {
                    /* ignore mid-typing invalid states */
                  }
                }}
              />
            </label>
          )}
        </div>

        <div className="stats">
          <Stat label={ar.sales.itemCount} value={String(cart.length)} />
          <Stat label={ar.sales.total} value={fromPiastres(totals.total)} good />
          {invoiceType === 'cash' && paidCash !== null && (
            <Stat label={ar.sales.change} value={fromPiastres(Math.max(change, 0))} />
          )}
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void checkout()}
          disabled={saving || cart.length === 0}
        >
          {invoiceType === 'cash' ? ar.sales.confirmCash : ar.sales.confirmCredit}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className={good ? 'stat stat--good' : 'stat'}>
      <span className="stat__value" dir="ltr">
        {value}
      </span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
