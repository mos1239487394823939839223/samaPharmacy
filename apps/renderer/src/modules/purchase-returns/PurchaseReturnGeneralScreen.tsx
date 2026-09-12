/**
 * مرتجعات شراء عام — a return with no source purchase invoice: stock going
 * back to a supplier for reasons unrelated to any specific receipt (recall,
 * negotiated bulk return, etc).
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemListRow, SupplierRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';

interface DraftLine {
  key: number;
  item: ItemListRow;
  batchId: number | null;
  batches: Array<{ id: number; qtyOnHand: number; batchNumber: string | null; unitCost: number }>;
  qty: string;
}

let keySeq = 1;

export function PurchaseReturnGeneralScreen() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierResults, setSupplierResults] = useState<SupplierRow[]>([]);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [itemQuery, setItemQuery] = useState('');
  const [itemResults, setItemResults] = useState<ItemListRow[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    const batches = await window.api.stock.batches(item.id);
    const withStock = batches
      .filter((b) => b.warehouseId === warehouseId && b.qtyOnHand > 0 && b.isQuarantined === 0)
      .map((b) => ({ id: b.id, qtyOnHand: b.qtyOnHand, batchNumber: b.batchNumber, unitCost: b.unitCost }));

    setLines((prev) => [
      ...prev,
      { key: keySeq++, item, batchId: withStock[0]?.id ?? null, batches: withStock, qty: '' },
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

    const valid = lines.filter((l) => l.batchId && Number(l.qty) > 0);
    if (valid.length === 0) return setError(ar.purchaseReturns.errors.noLines);

    try {
      const returnId = await window.api.purchaseReturns.create({
        supplierId: supplier.id,
        warehouseId,
        reason: reason.trim() || null,
        lines: valid.map((l) => ({
          itemId: l.item.id,
          batchId: l.batchId!,
          unitId: 1,
          qtyInUnit: Number(l.qty),
          qtyBase: Number(l.qty),
        })),
      });
      const created = await window.api.purchaseReturns.get(returnId);
      setNotice(ar.purchaseReturns.confirmed.replace('{serial}', String(created?.serial ?? returnId)));
      setLines([]);
    } catch (err) {
      setError(`${ar.purchaseReturns.errors.createFailed}: ${(err as Error).message}`);
    }
  }

  const totalCost = lines.reduce((s, l) => {
    const batch = l.batches.find((b) => b.id === l.batchId);
    return s + Number(l.qty || 0) * (batch?.unitCost ?? 0);
  }, 0);

  return (
    <div className="items">
      <div className="grid2" style={{ marginBlockEnd: '1rem' }}>
        <label className="formfield" style={{ position: 'relative' }}>
          <span className="formfield__label">
            {ar.purchaseReturns.supplier}
            <span className="req"> *</span>
          </span>
          <input
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
                    {s.nameAr}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
      </div>

      <div className="items__bar" style={{ position: 'relative' }}>
        <input
          className="field items__search"
          placeholder={ar.purchaseReturns.itemSearch}
          value={itemQuery}
          onChange={(e) => setItemQuery(e.target.value)}
        />
        {itemResults.length > 0 && (
          <ul className="autocomplete" style={{ top: '2.6rem' }}>
            {itemResults.map((it) => (
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
              <th>{ar.purchaseReturns.batch}</th>
              <th>{ar.purchaseReturns.onHandQty}</th>
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
                  <td dir="ltr">{batch?.qtyOnHand ?? 0}</td>
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
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}>
                      {ar.purchases.grid.remove}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <label className="formfield" style={{ marginBlockStart: '0.75rem', maxInlineSize: '24rem' }}>
        <span className="formfield__label">{ar.purchaseReturns.reason}</span>
        <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>

      <div className="stats" style={{ marginBlock: '0.75rem' }}>
        <div className="stat stat--good">
          <span className="stat__value" dir="ltr">
            {fromPiastres(totalCost)}
          </span>
          <span className="stat__label">{ar.purchaseReturns.total}</span>
        </div>
      </div>

      <button type="button" className="btn btn--primary" onClick={() => void submit()} disabled={lines.length === 0}>
        {ar.purchaseReturns.confirm}
      </button>
    </div>
  );
}
