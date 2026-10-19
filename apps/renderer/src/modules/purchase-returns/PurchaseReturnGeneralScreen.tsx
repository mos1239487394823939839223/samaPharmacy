/**
 * مرتجعات شراء عام — a return with no source purchase invoice: stock going
 * back to a supplier for reasons unrelated to any specific receipt (recall,
 * negotiated bulk return, etc).
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemListRow, SupplierRow } from '@pharmacy/shared';
import { fromPiastres, toAsciiDigits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { useBusy } from '../../lib/useBusy';
import { Stat } from '../../components/Stat';
import { useToast } from '../../components/Toast';
import { errorText } from '../../lib/errors';
import { baseQty, describeQty, type UnitOption } from '../../lib/units';
import { SearchInput } from '../../components/SearchInput';

interface DraftLine {
  key: number;
  item: ItemListRow;
  units: UnitOption[];
  unitId: number | null;
  batchId: number | null;
  batches: Array<{ id: number; qtyOnHand: number; batchNumber: string | null; unitCost: number }>;
  qty: string;
}

let keySeq = 1;

const unitOfLine = (l: DraftLine) => l.units.find((u) => u.id === l.unitId);

export function PurchaseReturnGeneralScreen() {
  const { busy, run } = useBusy();
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierResults, setSupplierResults] = useState<SupplierRow[]>([]);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [itemQuery, setItemQuery] = useState('');
  const [itemResults, setItemResults] = useState<ItemListRow[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** The return just saved — offered for printing until the next one. */
  const [lastReturnId, setLastReturnId] = useState<number | null>(null);
  const { showToast } = useToast();
  const supplierDebounce = useRef<ReturnType<typeof setTimeout>>();
  const itemDebounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      const def = list.find((w) => w.isDefault) ?? list[0];
      if (def) setWarehouseId(def.id);
    });
  }, []);

  useEffect(() => {
    if (!window.api || !supplierQuery.trim()) {
      setSupplierResults([]);
      return;
    }
    if (supplierDebounce.current) clearTimeout(supplierDebounce.current);
    supplierDebounce.current = setTimeout(() => {
      void window.api!.suppliers.search(supplierQuery, 10).then(setSupplierResults);
    }, 120);
    return () => {
      if (supplierDebounce.current) clearTimeout(supplierDebounce.current);
    };
  }, [supplierQuery]);

  useEffect(() => {
    if (!window.api || !itemQuery.trim()) {
      setItemResults([]);
      return;
    }
    if (itemDebounce.current) clearTimeout(itemDebounce.current);
    itemDebounce.current = setTimeout(() => {
      void window.api!.items.search(itemQuery, 10).then(setItemResults);
    }, 120);
    return () => {
      if (itemDebounce.current) clearTimeout(itemDebounce.current);
    };
  }, [itemQuery]);

  function selectSupplier(s: SupplierRow) {
    setSupplier(s);
    setSupplierQuery(s.nameAr);
    setSupplierResults([]);
  }

  async function addItem(item: ItemListRow) {
    if (!window.api || !warehouseId) return;
    const [detail, batches] = await Promise.all([
      window.api.items.get(item.id),
      window.api.stock.batches(item.id),
    ]);
    const withStock = batches
      .filter((b) => b.warehouseId === warehouseId && b.qtyOnHand > 0 && b.isQuarantined === 0)
      .map((b) => ({ id: b.id, qtyOnHand: b.qtyOnHand, batchNumber: b.batchNumber, unitCost: b.unitCost }));

    // unit_id is a real foreign key to item_units (docs/schema.sql) — every
    // item has its own distinct rows there, so this must be resolved per
    // item, never a hardcoded id that may belong to an unrelated item or not
    // exist at all.
    const units = (detail?.units ?? [])
      .map((u) => ({ id: u.id, nameAr: u.nameAr, factor: u.factor }))
      .sort((a, b) => b.factor - a.factor);
    const unit = detail?.units.find((u) => u.isDefaultSale) ?? units[0];

    setLines((prev) => [
      ...prev,
      { key: keySeq++, item, units, unitId: unit?.id ?? null, batchId: withStock[0]?.id ?? null, batches: withStock, qty: '' },
    ]);
    setItemQuery('');
    setItemResults([]);
  }

  function updateLine(key: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function submit() {
    if (!window.api || !warehouseId) return;
    setError(null);
    if (!supplier) return setError(ar.purchaseReturns.errors.noSupplier);

    const valid = lines.filter((l) => l.batchId && l.unitId && baseQty(l.qty, unitOfLine(l)) !== 0);
    if (valid.length === 0) return setError(ar.purchaseReturns.errors.noLines);

    if (valid.some((l) => baseQty(l.qty, unitOfLine(l)) === null)) return setError(ar.purchaseReturns.errors.qtyNotWhole);

    // The real bound is what is still on the shelf in the batch (the server
    // checks it too).
    const overQty = valid.find((l) => {
      const batch = l.batches.find((b) => b.id === l.batchId);
      return (baseQty(l.qty, unitOfLine(l)) ?? 0) > (batch?.qtyOnHand ?? 0);
    });
    if (overQty) return setError(ar.purchaseReturns.errors.qtyExceedsOnHand);

    try {
      const returnId = await window.api.purchaseReturns.create({
        supplierId: supplier.id,
        warehouseId,
        reason: reason.trim() || null,
        lines: valid.map((l) => ({
          itemId: l.item.id,
          batchId: l.batchId!,
          unitId: l.unitId!,
          qtyInUnit: Number(toAsciiDigits(l.qty)),
        })),
      });
      setLastReturnId(returnId);
      const created = await window.api.purchaseReturns.get(returnId);
      showToast(ar.purchaseReturns.confirmed.replace('{serial}', String(created?.serial ?? returnId)));
      setLines([]);
    } catch (err) {
      setError(errorText(err));
    }
  }

  const totalCost = lines.reduce((s, l) => {
    const batch = l.batches.find((b) => b.id === l.batchId);
    return s + (baseQty(l.qty, unitOfLine(l)) ?? 0) * (batch?.unitCost ?? 0);
  }, 0);

  return (
    <div className="items">
      <div className="grid2 mb">
        <label className="formfield field-wrap">
          <span className="formfield__label">
            {ar.purchaseReturns.supplier}
            <span className="req"> *</span>
          </span>
          <SearchInput
            className="field"
            placeholder={ar.purchaseReturns.supplierSearch}
            value={supplierQuery}
            onChange={(e) => {
              setSupplierQuery(e.target.value);
              setSupplier(null);
            }}
          />
          {supplierResults.length > 0 && (
            <ul className="autocomplete">
              {supplierResults.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => selectSupplier(s)}>
                    <span>{s.nameAr}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
      </div>

      <div className="items__bar field-wrap">
        <SearchInput
          className="field items__search"
          placeholder={ar.purchaseReturns.itemSearch}
          value={itemQuery}
          onChange={(e) => setItemQuery(e.target.value)}
        />
        {itemResults.length > 0 && (
          <ul className="autocomplete autocomplete--offset">
            {itemResults.map((it) => (
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
            onClick={() => void window.api!.print.document('purchaseReturn', lastReturnId).catch((err) => setError(errorText(err)))}
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
              <th>{ar.purchaseReturns.batch}</th>
              <th>{ar.purchaseReturns.onHandQty}</th>
              <th>{ar.purchaseReturns.unit}</th>
              <th>{ar.purchaseReturns.returnQty}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const batch = l.batches.find((b) => b.id === l.batchId);
              return (
                <tr key={l.key}>
                  <td>{l.item.nameAr}</td>
                  <td>
                    <select
                      className="field"
                      value={l.batchId ?? ''}
                      onChange={(e) => updateLine(l.key, { batchId: Number(e.target.value) })}
                    >
                      {l.batches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batchNumber ?? `#${b.id}`}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{describeQty(batch?.qtyOnHand ?? 0, l.units)}</td>
                  <td>
                    <select
                      className="field field--sm"
                      value={l.unitId ?? ''}
                      onChange={(e) => updateLine(l.key, { unitId: Number(e.target.value) })}
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
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}>
                      {ar.purchases.grid.remove}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}

      <label className="formfield formfield--narrow mt">
        <span className="formfield__label">{ar.purchaseReturns.reason}</span>
        <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>

      <div className="stats my">
        <Stat label={ar.purchaseReturns.total} value={fromPiastres(totalCost)} good />
      </div>

      <div className="btn-row" style={{ marginBlockStart: 0 }}>
        <button type="button" className="btn btn--primary" onClick={() => void run(submit)} disabled={busy || lines.length === 0}>
          {ar.purchaseReturns.confirm}
        </button>
      </div>
    </div>
  );
}
