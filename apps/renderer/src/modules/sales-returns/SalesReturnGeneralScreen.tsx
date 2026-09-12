/**
 * مرتجع بيع عام — a return with no source invoice: a customer without their
 * receipt, or stock coming back from somewhere the system never recorded a
 * sale for. Requires approvedBy (schema-enforced) and the refunded price is
 * capped at public_price — there is no invoice here to bound it otherwise.
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemListRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';

interface DraftLine {
  key: number;
  item: ItemListRow;
  batchId: number | null;
  batches: Array<{ id: number; qtyOnHand: number; expiryDate: string | null }>;
  qty: string;
  unitPrice: number | null;
  damaged: boolean;
}

let keySeq = 1;

export function SalesReturnGeneralScreen() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemListRow[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit_note' | 'account'>('cash');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      const def = list.find((w) => w.isDefault) ?? list[0];
      if (def) setWarehouseId(def.id);
    });
  }, []);

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

  async function addItem(item: ItemListRow) {
    if (!window.api || !warehouseId) return;
    // A general return still needs a real batch to add stock back to — use
    // whatever batch of this item already exists in this warehouse (sellable
    // or not), so the returned stock has somewhere concrete to land.
    const batches = await window.api.stock.batches(item.id);
    const relevant = batches
      .filter((b) => b.warehouseId === warehouseId)
      .map((b) => ({ id: b.id, qtyOnHand: b.qtyOnHand, expiryDate: b.expiryDate }));

    setLines((prev) => [
      ...prev,
      {
        key: keySeq++,
        item,
        batchId: relevant[0]?.id ?? null,
        batches: relevant,
        qty: '',
        unitPrice: item.publicPrice,
        damaged: false,
      },
    ]);
    setQuery('');
    setResults([]);
  }

  function updateLine(key: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function submit() {
    if (!window.api || !warehouseId) return;
    setError(null);

    const valid = lines.filter((l) => l.batchId && Number(l.qty) > 0 && l.unitPrice !== null);
    if (valid.length === 0) return setError(ar.salesReturns.errors.noLines);

    try {
      const returnId = await window.api.salesReturns.create({
        warehouseId,
        // A single logged-in owner user stands in for the approving
        // pharmacist until M10 (users/roles) exists — see the system user
        // seeded in migration 0002.
        approvedBy: 1,
        refundMethod,
        reason: reason.trim() || null,
        lines: valid.map((l) => ({
          itemId: l.item.id,
          batchId: l.batchId!,
          unitId: 1,
          qtyInUnit: Number(l.qty),
          qtyBase: Number(l.qty),
          unitPrice: l.unitPrice!,
          damaged: l.damaged,
        })),
      });
      const created = await window.api.salesReturns.get(returnId);
      setNotice(ar.salesReturns.confirmed.replace('{serial}', String(created?.serial ?? returnId)));
      setLines([]);
    } catch (err) {
      setError(`${ar.salesReturns.errors.createFailed}: ${(err as Error).message}`);
    }
  }

  const total = lines.reduce((s, l) => s + Number(l.qty || 0) * (l.unitPrice ?? 0), 0);

  return (
    <div className="items">
      <p className="hint">{ar.salesReturns.priceCapNotice}</p>

      <div className="items__bar" style={{ position: 'relative' }}>
        <input
          className="field items__search"
          placeholder={ar.salesReturns.itemSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="autocomplete" style={{ top: '2.6rem' }}>
            {results.map((it) => (
              <li key={it.id}>
                <button type="button" onClick={() => void addItem(it)}>
                  {it.nameAr}
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

      {lines.length > 0 && (
        <table className="subtable">
          <thead>
            <tr>
              <th>{ar.items.fields.nameAr}</th>
              <th>{ar.salesReturns.returnQty}</th>
              <th>{ar.salesReturns.unitPrice}</th>
              <th>{ar.salesReturns.damaged}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td>{l.item.nameAr}</td>
                <td>
                  <input
                    className="field"
                    dir="ltr"
                    style={{ maxInlineSize: '5rem' }}
                    inputMode="numeric"
                    value={l.qty}
                    onChange={(e) => updateLine(l.key, { qty: e.target.value })}
                  />
                </td>
                <td>
                  <MoneyInput value={l.unitPrice} onChange={(v) => updateLine(l.key, { unitPrice: v })} />
                </td>
                <td className="center">
                  <input type="checkbox" checked={l.damaged} onChange={(e) => updateLine(l.key, { damaged: e.target.checked })} />
                </td>
                <td>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}>
                    {ar.purchases.grid.remove}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="grid2" style={{ marginBlockStart: '1rem' }}>
        <label className="formfield">
          <span className="formfield__label">{ar.salesReturns.refundMethod}</span>
          <select className="field" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as 'cash')}>
            <option value="cash">{ar.salesReturns.cash}</option>
            <option value="credit_note">{ar.salesReturns.creditNote}</option>
            <option value="account">{ar.salesReturns.account}</option>
          </select>
        </label>
        <label className="formfield">
          <span className="formfield__label">{ar.salesReturns.reason}</span>
          <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>

      <p className="hint">{ar.salesReturns.approvalRequired}</p>

      <div className="stats" style={{ marginBlockEnd: '0.75rem' }}>
        <div className="stat stat--good">
          <span className="stat__value" dir="ltr">
            {fromPiastres(total)}
          </span>
          <span className="stat__label">{ar.salesReturns.total}</span>
        </div>
      </div>

      <button type="button" className="btn btn--primary" onClick={() => void submit()} disabled={lines.length === 0}>
        {ar.salesReturns.confirm}
      </button>
    </div>
  );
}
