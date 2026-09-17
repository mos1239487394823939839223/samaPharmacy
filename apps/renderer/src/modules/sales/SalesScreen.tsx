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
import type { CustomerRow, ItemListRow } from '@pharmacy/shared';
import { fromPiastres, toAsciiDigits, toPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { Stat } from '../../components/Stat';
import { useToast } from '../../components/Toast';
import { useBarcodeScanner } from '../../hardware/scanner';
import { loadScannerConfig } from '../../hardware/config';
import { EmptyState } from '../../components/EmptyState';
import { MoneyInput } from '../../components/MoneyInput';

interface CartLine {
  key: number;
  item: ItemListRow;
  unitId: number;
  unitFactor: number;
  /** Raw text the user is editing — parsed to a number only for math/submit,
      never fed back into the input's value (rule: buffer text, don't
      reformat mid-typing; see MoneyInput for the same pattern with money). */
  qty: string;
  unitPrice: number;
  /** Flat discount for the whole line, in EGP as typed — "2" is two pounds,
      "2.5" is two pounds fifty, exactly like any other money field. Not a
      percentage: parsed through toPiastres (money's own decimal-string
      parser) and submitted as discountAmt, never discountPct. */
  discountEgp: string;
}

function parseQty(text: string): number {
  const n = Number(toAsciiDigits(text));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Piastres from a possibly-empty/partial EGP string, never throwing —
    the cart re-renders on every keystroke, so a mid-edit value like "2." or
    "" must fall back to 0 instead of blowing up the totals row. */
function parseDiscountPiastres(text: string): number {
  const trimmed = toAsciiDigits(text).trim();
  if (trimmed === '') return 0;
  try {
    const piastres = toPiastres(trimmed);
    return piastres > 0 ? piastres : 0;
  } catch {
    return 0;
  }
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
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const customerDebounce = useRef<ReturnType<typeof setTimeout>>();

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
        return prev.map((l) => (l === existing ? { ...l, qty: String(parseQty(l.qty) + 1) } : l));
      }
      return [
        ...prev,
        {
          key: keySeq++,
          item,
          unitId: unit.id,
          unitFactor: unit.factor,
          qty: '1',
          unitPrice: unit.salePrice,
          discountEgp: '0',
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

  useEffect(() => {
    if (!window.api || !customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    if (customerDebounce.current) clearTimeout(customerDebounce.current);
    customerDebounce.current = setTimeout(() => {
      void window.api!.customers.search(customerQuery, 10).then(setCustomerResults);
    }, 120);
    return () => {
      if (customerDebounce.current) clearTimeout(customerDebounce.current);
    };
  }, [customerQuery]);

  // Cash never carries a customer forward from a prior credit invoice in the
  // same session — clearing it here instead of leaving stale state avoids
  // silently attaching the wrong customer if the pharmacist switches back
  // and forth on the same draft.
  function selectInvoiceType(next: 'cash' | 'credit') {
    setInvoiceType(next);
    if (next === 'cash') {
      setCustomer(null);
      setCustomerQuery('');
      setCustomerResults([]);
    }
  }

  function selectCustomer(c: CustomerRow) {
    setCustomer(c);
    setCustomerQuery('');
    setCustomerResults([]);
  }

  function updateLine(key: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: number) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  const totals = cart.reduce(
    (acc, l) => {
      const before = parseQty(l.qty) * l.unitPrice;
      const discount = Math.min(parseDiscountPiastres(l.discountEgp), before);
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
    // parseQty coerces an empty/invalid quantity field to 0 for the totals
    // display, so nothing else here catches an emptied qty before submit —
    // it used to reach the backend's zod schema (qtyInUnit must be >0) and
    // fail there instead, surfacing the schema's raw JSON error to the user.
    if (cart.some((l) => parseQty(l.qty) <= 0)) return setError(ar.sales.errors.invalidQty);
    if (invoiceType === 'cash' && (paidCash ?? 0) < totals.total) {
      return setError(ar.sales.errors.insufficientPaid);
    }
    // confirmSalesInvoice rejects a credit invoice with no customer — caught
    // here instead of letting the draft get created and fail at confirm,
    // which used to surface the backend's raw English error message.
    if (invoiceType === 'credit' && !customer) return setError(ar.sales.errors.noCustomer);
    if (!window.api) return setError(ar.status.noBridge);

    setSaving(true);
    try {
      const invoiceId = await window.api.sales.create({
        warehouseId,
        invoiceType,
        customerId: invoiceType === 'credit' ? customer!.id : null,
        // A credit invoice's total is owed on the customer's account, not
        // paid in cash — recording it as paidCash: totals.total here would
        // both mark the invoice fully paid AND post the full amount to the
        // customer's ledger (postCreditSale), double-counting the money.
        paidCash: invoiceType === 'cash' ? (paidCash ?? totals.total) : 0,
        lines: cart.map((l, i) => {
          const before = parseQty(l.qty) * l.unitPrice;
          return {
            lineNo: i + 1,
            itemId: l.item.id,
            unitId: l.unitId,
            unitFactor: l.unitFactor,
            qtyInUnit: parseQty(l.qty),
            unitPrice: l.unitPrice,
            discountAmt: Math.min(parseDiscountPiastres(l.discountEgp), before),
          };
        }),
      });

      await window.api.sales.confirm(invoiceId);
      const invoice = await window.api.sales.get(invoiceId);

      showToast(ar.sales.confirmed.replace('{serial}', String(invoice?.serial ?? invoiceId)));
      setCart([]);
      setPaidCash(null);
      setCustomer(null);
      searchRef.current?.focus();
    } catch (err) {
      const message = (err as Error).message;
      // The db-process boundary flattens every thrown error down to a bare
      // string (see db-process/index.ts's catch), so InsufficientStockError
      // can't be matched by class or `.name` here — only by the message
      // shape it actually throws (packages/core/fefo.ts), not the plain
      // "Insufficient stock" text this used to look for, which that error
      // never contains and so never matched, leaking the raw English/SQL
      // message to the pharmacist instead of a translated one.
      setError(
        /available across sellable batches/.test(message)
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
          <ul className="autocomplete autocomplete--offset">
            {results.map((it) => (
              <li key={it.id}>
                <button type="button" onClick={() => void addItemToCart(it)}>
                  <span>{it.nameAr}</span>
                  {it.publicPrice !== null && <span dir="ltr">{fromPiastres(it.publicPrice)}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {cart.length === 0 ? (
        <EmptyState title={ar.sales.emptyCart} />
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
              const before = parseQty(l.qty) * l.unitPrice;
              const after = before - Math.min(parseDiscountPiastres(l.discountEgp), before);
              return (
                <tr key={l.key}>
                  <td>{l.item.nameAr}</td>
                  <td>
                    <input
                      className="field field--sm"
                      dir="ltr"
                      inputMode="decimal"
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                    />
                  </td>
                  <td dir="ltr">{fromPiastres(l.unitPrice)}</td>
                  <td>
                    <input
                      className="field field--xs"
                      dir="ltr"
                      inputMode="decimal"
                      value={l.discountEgp}
                      onChange={(e) => updateLine(l.key, { discountEgp: toAsciiDigits(e.target.value) })}
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
              onChange={(e) => selectInvoiceType(e.target.value as 'cash' | 'credit')}
            >
              <option value="cash">{ar.sales.cash}</option>
              <option value="credit">{ar.sales.credit}</option>
            </select>
          </label>
          {invoiceType === 'cash' && (
            <label className="formfield">
              <span className="formfield__label">{ar.sales.paidCash}</span>
              <MoneyInput value={paidCash} onChange={setPaidCash} />
            </label>
          )}
          {invoiceType === 'credit' && (
            <label className="formfield">
              <span className="formfield__label">
                {ar.sales.customer}
                <span className="req"> *</span>
              </span>
              {customer ? (
                <div className="pos__customer-picked">
                  <span>
                    {customer.name} <span dir="ltr">#{customer.code}</span>
                  </span>
                  <button type="button" className="btn btn--sm" onClick={() => setCustomer(null)}>
                    {ar.sales.changeCustomer}
                  </button>
                </div>
              ) : (
                <div className="field-wrap">
                  <input
                    className="field"
                    placeholder={ar.sales.customerSearch}
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                  />
                  {customerResults.length > 0 && (
                    <ul className="autocomplete autocomplete--offset">
                      {customerResults.map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => selectCustomer(c)}>
                            <span>{c.name}</span> <span dir="ltr">#{c.code}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </label>
          )}
        </div>

        <div className="stats">
          <Stat label={ar.sales.itemCount} value={String(cart.length)} neutral />
          <Stat label={ar.sales.total} value={fromPiastres(totals.total)} good />
          {invoiceType === 'cash' && paidCash !== null && (
            <Stat label={ar.sales.change} value={fromPiastres(Math.max(change, 0))} neutral />
          )}
        </div>

        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void checkout()}
          disabled={saving || cart.length === 0 || (invoiceType === 'credit' && !customer)}
        >
          {invoiceType === 'cash' ? ar.sales.confirmCash : ar.sales.confirmCredit}
        </button>
      </div>
    </div>
  );
}
