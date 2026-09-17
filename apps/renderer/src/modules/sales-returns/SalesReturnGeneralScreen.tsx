/**
 * مرتجع بيع عام — a return with no source invoice: a customer without their
 * receipt, or stock coming back from somewhere the system never recorded a
 * sale for. Requires approvedBy (schema-enforced) and the refunded price is
 * capped at public_price — there is no invoice here to bound it otherwise.
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemListRow } from '@pharmacy/shared';
import { fromPiastres, toAsciiDigits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { Stat } from '../../components/Stat';
import { useToast } from '../../components/Toast';

interface DraftLine {
  key: number;
  item: ItemListRow;
  unitId: number | null;
  batchId: number | null;
  batches: Array<{ id: number; qtyOnHand: number; expiryDate: string | null }>;
  qty: string;
  unitPrice: number | null;
  publicPrice: number | null;
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
  const { showToast } = useToast();
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
    // whatever non-quarantined batch of this item already exists in this
    // warehouse, so the returned stock has somewhere concrete to land. A
    // quarantined batch is excluded as a *target* here — BR-12/the damaged
    // flag are what route stock into quarantine, not a manual pick of one.
    const [detail, batches] = await Promise.all([
      window.api.items.get(item.id),
      window.api.stock.batches(item.id),
    ]);
    const relevant = batches
      .filter((b) => b.warehouseId === warehouseId && !b.isQuarantined)
      .map((b) => ({ id: b.id, qtyOnHand: b.qtyOnHand, expiryDate: b.expiryDate }));

    // unit_id is a real foreign key to item_units (docs/schema.sql) — every
    // item has its own distinct rows there, so this must be resolved per
    // item the same way SalesScreen resolves it for a sale line, never a
    // hardcoded id that may belong to an unrelated item or not exist at all.
    const unit = detail?.units.find((u) => u.isDefaultSale) ?? detail?.units[0];

    setLines((prev) => [
      ...prev,
      {
        key: keySeq++,
        item,
        unitId: unit?.id ?? null,
        batchId: relevant[0]?.id ?? null,
        batches: relevant,
        qty: '',
        unitPrice: item.publicPrice,
        publicPrice: item.publicPrice,
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

    const valid = lines.filter((l) => l.batchId && l.unitId && Number(l.qty) > 0 && l.unitPrice !== null);
    if (valid.length === 0) return setError(ar.salesReturns.errors.noLines);

    if (lines.some((l) => !l.batchId)) return setError(ar.salesReturns.errors.noBatch);

    // createSalesReturn's zod schema requires qtyBase to be a positive
    // integer — checked here so a fractional quantity fails with the Arabic
    // message instead of the schema's raw English one after submit.
    if (valid.some((l) => !Number.isInteger(Number(l.qty)))) return setError(ar.salesReturns.errors.qtyNotWhole);

    if (valid.some((l) => (l.unitPrice ?? 0) < 0)) return setError(ar.salesReturns.errors.negativePrice);

    // Mirrors createSalesReturn's own general-return price cap (there is no
    // source invoice here to bound the refund otherwise) — checked before
    // submit so an edited price above public_price fails with the Arabic
    // message instead of the repository's raw error.
    const overPriced = valid.find((l) => l.publicPrice != null && (l.unitPrice ?? 0) > l.publicPrice);
    if (overPriced) return setError(ar.salesReturns.errors.priceAbovePublic);

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
          unitId: l.unitId!,
          qtyInUnit: Number(l.qty),
          qtyBase: Number(l.qty),
          unitPrice: l.unitPrice!,
          damaged: l.damaged,
        })),
      });
      const created = await window.api.salesReturns.get(returnId);
      showToast(ar.salesReturns.confirmed.replace('{serial}', String(created?.serial ?? returnId)));
      setLines([]);
    } catch (err) {
      setError(`${ar.salesReturns.errors.createFailed}: ${(err as Error).message}`);
    }
  }

  const total = lines.reduce((s, l) => s + Number(l.qty || 0) * (l.unitPrice ?? 0), 0);

  return (
    <div className="items">
      <p className="hint">{ar.salesReturns.priceCapNotice}</p>

      <div className="items__bar field-wrap">
        <input
          className="field items__search"
          placeholder={ar.salesReturns.itemSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="autocomplete autocomplete--offset">
            {results.map((it) => (
              <li key={it.id}>
                <button type="button" onClick={() => void addItem(it)}>
                  <span>{it.nameAr}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {lines.length > 0 && (
        <table className="subtable">
          <thead>
            <tr>
              <th>{ar.items.fields.nameAr}</th>
              <th>{ar.salesReturns.batch}</th>
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
                  {l.batches.length === 0 ? (
                    <span className="muted small">{ar.salesReturns.noBatch}</span>
                  ) : (
                    <select
                      className="field field--sm"
                      value={l.batchId ?? ''}
                      onChange={(e) => updateLine(l.key, { batchId: Number(e.target.value) })}
                    >
                      {l.batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.expiryDate ?? '—'} ({b.qtyOnHand})
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  <input
                    className="field field--sm"
                    dir="ltr"
                    inputMode="numeric"
                    value={l.qty}
                    onChange={(e) =>
                      updateLine(l.key, { qty: toAsciiDigits(e.target.value).replace(/[^\d]/g, '') })
                    }
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

      <div className="grid2 mt">
        <label className="formfield">
          <span className="formfield__label">{ar.salesReturns.refundMethod}</span>
          {/* No 'account' option here: recordCustomerPayment only fires with
              a customerId, and a general return (no source invoice) has no
              customer picker anywhere to supply one — offering it would
              silently confirm the return with no ledger effect. */}
          <select className="field" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value as 'cash')}>
            <option value="cash">{ar.salesReturns.cash}</option>
            <option value="credit_note">{ar.salesReturns.creditNote}</option>
          </select>
        </label>
        <label className="formfield">
          <span className="formfield__label">{ar.salesReturns.reason}</span>
          <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>

      <p className="hint">{ar.salesReturns.approvalRequired}</p>

      <div className="stats mb">
        <Stat label={ar.salesReturns.total} value={fromPiastres(total)} good />
      </div>

      <div className="btn-row" style={{ marginBlockStart: 0 }}>
        <button type="button" className="btn btn--primary" onClick={() => void submit()} disabled={lines.length === 0}>
          {ar.salesReturns.confirm}
        </button>
      </div>
    </div>
  );
}
