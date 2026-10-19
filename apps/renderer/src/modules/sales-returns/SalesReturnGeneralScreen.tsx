/**
 * مرتجع بيع عام — a return with no invoice (the customer lost the receipt).
 * Refunded in cash. With no invoice to bound it, each unit's refund is capped
 * at its share of the box public price (BR-4, decision D9) — the same cap the
 * server enforces. The stock goes back into a batch of the item in this
 * warehouse (the pharmacist may pick which), or to quarantine for fridge /
 * damaged goods.
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemListRow } from '@pharmacy/shared';
import { boxFactorOf, fromPiastres, lineValue, maxUnitPrice, toAsciiDigits, toBaseUnits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { Stat } from '../../components/Stat';
import { useToast } from '../../components/Toast';
import { errorText } from '../../lib/errors';
import { SearchInput } from '../../components/SearchInput';

interface UnitOption {
  id: number;
  nameAr: string;
  factor: number;
  salePrice: number;
}

interface DraftLine {
  key: number;
  item: ItemListRow;
  units: UnitOption[];
  unitId: number;
  batchId: number | null;
  batches: Array<{ id: number; qtyOnHand: number; expiryDate: string | null }>;
  qty: string;
  unitPrice: number | null;
  damaged: boolean;
}

let keySeq = 1;

function unitOf(l: DraftLine): UnitOption {
  return l.units.find((u) => u.id === l.unitId) ?? l.units[0]!;
}

/** BR-4 ceiling for the line's unit, or null when the item has no public price. */
function capOf(l: DraftLine): number | null {
  if (l.item.publicPrice == null) return null;
  return maxUnitPrice(l.item.publicPrice, boxFactorOf(l.units), unitOf(l).factor);
}

export function SalesReturnGeneralScreen() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemListRow[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** The return just saved — offered for printing until the next one. */
  const [lastReturnId, setLastReturnId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
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
    const [detail, batches] = await Promise.all([window.api.items.get(item.id), window.api.stock.batches(item.id)]);
    const relevant = batches
      .filter((b) => b.warehouseId === warehouseId && !b.isQuarantined)
      .map((b) => ({ id: b.id, qtyOnHand: b.qtyOnHand, expiryDate: b.expiryDate }));
    const units = (detail?.units ?? [])
      .map((u) => ({ id: u.id, nameAr: u.nameAr, factor: u.factor, salePrice: u.salePrice }))
      .sort((a, b) => b.factor - a.factor);
    const unit = detail?.units.find((u) => u.isDefaultSale && u.allowSale) ?? units[0];
    if (!unit) return setError(ar.sales.errors.noSellableUnit.replace('{item}', item.nameAr));

    setLines((prev) => [
      ...prev,
      {
        key: keySeq++,
        item,
        units,
        unitId: unit.id,
        batchId: relevant[0]?.id ?? null,
        batches: relevant,
        qty: '1',
        unitPrice: unit.salePrice,
        damaged: false,
      },
    ]);
    setQuery('');
    setResults([]);
  }

  function updateLine(key: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function lineTotal(l: DraftLine): number {
    const qty = Number(toAsciiDigits(l.qty));
    return Number.isFinite(qty) && qty > 0 ? lineValue(qty, l.unitPrice ?? 0) : 0;
  }

  const total = lines.reduce((s, l) => s + lineTotal(l), 0);

  async function submit() {
    if (!window.api || !warehouseId || saving) return;
    setError(null);
    if (lines.length === 0) return setError(ar.salesReturns.errors.noLines);

    for (const l of lines) {
      const qty = Number(toAsciiDigits(l.qty));
      if (!(qty > 0)) return setError(ar.errors['return.qtyInvalid']);
      try {
        toBaseUnits(qty, unitOf(l).factor);
      } catch {
        return setError(ar.errors['return.qtyNotWhole'].replace('{qty}', l.qty).replace('{unit}', unitOf(l).nameAr));
      }
      if (l.batches.length === 0) return setError(ar.errors['return.noBatch'].replace('{item}', l.item.nameAr));
      const cap = capOf(l);
      if (l.unitPrice == null) return setError(ar.salesReturns.errors.priceRequired.replace('{item}', l.item.nameAr));
      if (cap != null && l.unitPrice > cap) {
        return setError(ar.errors['return.priceAbovePublic'].replace('{cap}', `${fromPiastres(cap)} ج.م`));
      }
    }

    setSaving(true);
    try {
      const input = {
        warehouseId,
        refundMethod: 'cash' as const,
        reason: reason.trim() || null,
        lines: lines.map((l) => ({
          itemId: l.item.id,
          batchId: l.batchId,
          unitId: l.unitId,
          qtyInUnit: Number(toAsciiDigits(l.qty)),
          unitPrice: l.unitPrice!,
          damaged: l.damaged,
        })),
      };
      const returnId = await window.api.salesReturns.create(input);
      setLastReturnId(returnId);
      const created = await window.api.salesReturns.get(returnId);
      showToast(ar.salesReturns.confirmed.replace('{serial}', String(created?.serial ?? returnId)));
      setLines([]);
      setReason('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="items">
      <p className="hint">{ar.salesReturns.priceCapNotice}</p>

      <div className="items__bar field-wrap">
        <SearchInput
          className="field items__search"
          placeholder={ar.salesReturns.itemSearch}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => (e.code === 'Enter' || e.code === 'NumpadEnter') && results[0] && void addItem(results[0])}
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
      {lastReturnId && (
        <div className="btn-row" style={{ marginBlockStart: 0 }}>
          <button
            type="button"
            className="btn btn--sm"
            onClick={() => void window.api!.print.document('salesReturn', lastReturnId).catch((err) => setError(errorText(err)))}
          >
            {ar.print.lastReturn}
          </button>
        </div>
      )}

      {lines.length > 0 && (
        <div className="table-wrap"><table className="subtable">
          <thead>
            <tr>
              <th>{ar.items.fields.nameAr}</th>
              <th>{ar.salesReturns.batch}</th>
              <th>{ar.salesReturns.unit}</th>
              <th>{ar.salesReturns.returnQty}</th>
              <th>{ar.salesReturns.unitPrice}</th>
              <th>{ar.salesReturns.refund}</th>
              <th>{ar.salesReturns.damaged}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const cap = capOf(l);
              const over = cap != null && (l.unitPrice ?? 0) > cap;
              return (
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
                    <select
                      className="field field--sm"
                      value={l.unitId}
                      onChange={(e) => {
                        const unit = l.units.find((u) => u.id === Number(e.target.value));
                        if (unit) updateLine(l.key, { unitId: unit.id, unitPrice: unit.salePrice });
                      }}
                    >
                      {l.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nameAr}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="field field--sm"
                      dir="ltr"
                      inputMode="decimal"
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: toAsciiDigits(e.target.value) })}
                    />
                  </td>
                  <td>
                    <MoneyInput value={l.unitPrice} onChange={(v) => updateLine(l.key, { unitPrice: v })} />
                    {over && <span className="text-bad small">≤ {fromPiastres(cap!)}</span>}
                  </td>
                  <td dir="ltr" className="strong">{fromPiastres(lineTotal(l))}</td>
                  <td className="center">
                    <input type="checkbox" checked={l.damaged} onChange={(e) => updateLine(l.key, { damaged: e.target.checked })} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                    >
                      {ar.purchases.grid.remove}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}

      <div className="grid2 mt">
        <div className="formfield">
          <span className="formfield__label">{ar.salesReturns.refundMethod}</span>
          <span className="strong">{ar.salesReturns.cash}</span>
        </div>
        <label className="formfield">
          <span className="formfield__label">{ar.salesReturns.reason}</span>
          <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </div>

      <p className="hint">{ar.salesReturns.approvalRequired}</p>

      <div className="stats mb">
        <Stat label={ar.salesReturns.refundTotal} value={fromPiastres(total)} good />
      </div>

      <div className="btn-row" style={{ marginBlockStart: 0 }}>
        <button type="button" className="btn btn--primary" onClick={() => void submit()} disabled={saving || lines.length === 0}>
          {ar.salesReturns.confirm}
        </button>
      </div>
    </div>
  );
}
