/**
 * فاتورة شراء — blueprint §1.7.
 *
 * Supplier autocomplete, بونص column, per-line expiry, header expenses and
 * extra discount. Landed cost per line is a live client-side preview only —
 * the authoritative figure is written by confirmPurchaseInvoice inside its
 * transaction, using the exact same packages/core/landedCost() function
 * against the persisted lines, not this preview.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ItemListRow, SupplierRow, WarehouseRow } from '@pharmacy/shared';
import { fromPiastres, landedCost, toBaseUnits, type LandedCostLine } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { attachShortcuts } from '../../lib/shortcuts';

interface DraftLine {
  key: number;
  item: ItemListRow | null;
  itemQuery: string;
  itemResults: ItemListRow[];
  unitFactor: number;
  qtyInUnit: string;
  bonusInUnit: string;
  batchNumber: string;
  expiryDate: string;
  unitPurchasePrice: number | null;
  discountPct: string;
  taxPct: string;
}

let keySeq = 1;
const newLine = (): DraftLine => ({
  key: keySeq++,
  item: null,
  itemQuery: '',
  itemResults: [],
  unitFactor: 1,
  qtyInUnit: '',
  bonusInUnit: '',
  batchNumber: '',
  expiryDate: '',
  unitPurchasePrice: null,
  discountPct: '',
  taxPct: '',
});

interface Props {
  onSaved: () => void;
  onCancel: () => void;
}

export function PurchaseForm({ onSaved, onCancel }: Props) {
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierResults, setSupplierResults] = useState<SupplierRow[]>([]);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [supplierBalance, setSupplierBalance] = useState<number | null>(null);

  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);

  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [purchaseType, setPurchaseType] = useState<'cash' | 'credit'>('credit');
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenses, setExpenses] = useState<number | null>(null);
  const [extraDiscountAmt, setExtraDiscountAmt] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const savedInvoiceId = useRef<number | null>(null);

  useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      setWarehouses(list);
      const def = list.find((w) => w.isDefault);
      if (def) setWarehouseId(def.id);
    });
  }, []);

  useEffect(() => {
    if (!window.api || !supplierQuery.trim()) {
      setSupplierResults([]);
      return;
    }
    const t = setTimeout(() => {
      void window.api!.suppliers.search(supplierQuery, 10).then(setSupplierResults);
    }, 120);
    return () => clearTimeout(t);
  }, [supplierQuery]);

  useEffect(() => {
    if (!supplier || !window.api) {
      setSupplierBalance(null);
      return;
    }
    void window.api.suppliers.balance(supplier.id).then(setSupplierBalance);
  }, [supplier]);

  function selectSupplier(s: SupplierRow) {
    setSupplier(s);
    setSupplierQuery(s.nameAr);
    setSupplierResults([]);
  }

  function updateLine(key: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function searchItemsForLine(key: number, query: string) {
    // Typing again after a selection clears it -- the user is picking a new
    // item, not editing free text next to the old one.
    updateLine(key, { itemQuery: query, item: null, itemResults: [] });
    if (!window.api || query.trim() === '') return;
    void window.api.items.search(query, 10).then((results) => updateLine(key, { itemResults: results }));
  }

  function selectItemForLine(key: number, item: ItemListRow) {
    updateLine(key, {
      item,
      itemQuery: item.nameAr,
      itemResults: [],
      // Default to the item's base unit factor; refined once units are
      // fetched. Purchase entry works in whatever unit the pharmacist types.
      unitFactor: 1,
    });
    if (!window.api) return;
    void window.api.items.get(item.id).then((detail) => {
      const defaultUnit = detail?.units.find((u) => u.isDefaultSale) ?? detail?.units[0];
      if (defaultUnit) updateLine(key, { unitFactor: defaultUnit.factor });
    });
  }

  // Live preview only. Confirmed values are recomputed server-side from the
  // persisted rows by the exact same landedCost() call.
  const preview = useMemo(() => {
    const inputs: LandedCostLine[] = [];
    const valid = lines.filter((l) => l.item && l.qtyInUnit && l.unitPurchasePrice != null);

    for (const l of valid) {
      const qtyBase = toBaseUnits(Number(l.qtyInUnit), l.unitFactor);
      const bonusBase = l.bonusInUnit ? toBaseUnits(Number(l.bonusInUnit), l.unitFactor) : 0;
      const beforeDiscount = Number(l.qtyInUnit) * (l.unitPurchasePrice ?? 0);
      const discountAmt = Math.round((beforeDiscount * Number(l.discountPct || 0)) / 100);
      const afterDiscount = beforeDiscount - discountAmt;
      const taxAmt = Math.round((afterDiscount * Number(l.taxPct || 0)) / 100);
      const afterTax = afterDiscount + taxAmt;
      inputs.push({ lineNo: l.key, lineTotal: afterTax, qtyBase, bonusBase });
    }

    if (inputs.length === 0) return { subtotal: 0, taxTotal: 0, total: 0, costs: new Map() };

    const costs = landedCost(inputs, expenses ?? 0, extraDiscountAmt ?? 0);
    const subtotal = valid.reduce((s, l) => s + Number(l.qtyInUnit) * (l.unitPurchasePrice ?? 0), 0);
    const total = inputs.reduce((s, i) => s + i.lineTotal, 0) + (expenses ?? 0) - (extraDiscountAmt ?? 0);

    return {
      subtotal,
      taxTotal: 0,
      total,
      costs: new Map(costs.map((c) => [c.lineNo, c.landedUnitCost])),
    };
  }, [lines, expenses, extraDiscountAmt]);

  async function submit(confirmAfterSave: boolean) {
    setError(null);
    if (!supplier) return setError(ar.purchases.errors.noSupplier);
    if (!warehouseId) return setError(ar.purchases.errors.noWarehouse);
    const validLines = lines.filter((l) => l.item);
    if (validLines.length === 0) return setError(ar.purchases.errors.noLines);
    if (!window.api) return setError(ar.status.noBridge);

    setSaving(true);
    try {
      const input = {
        supplierInvoiceNo: supplierInvoiceNo.trim() || `AUTO-${Date.now()}`,
        supplierId: supplier.id,
        warehouseId,
        purchaseType,
        invoiceDate,
        expenses: expenses ?? 0,
        extraDiscountAmt: extraDiscountAmt ?? 0,
        notes: notes.trim() || null,
        lines: validLines.map((l, i) => ({
          lineNo: i + 1,
          itemId: l.item!.id,
          unitId: 1,
          qtyInUnit: Number(l.qtyInUnit),
          qtyBase: toBaseUnits(Number(l.qtyInUnit), l.unitFactor),
          bonusInUnit: l.bonusInUnit ? Number(l.bonusInUnit) : 0,
          bonusBase: l.bonusInUnit ? toBaseUnits(Number(l.bonusInUnit), l.unitFactor) : 0,
          batchNumber: l.batchNumber.trim() || null,
          expiryDate: l.expiryDate || null,
          unitPurchasePrice: l.unitPurchasePrice ?? 0,
          discountPct: Number(l.discountPct || 0),
          taxPct: Number(l.taxPct || 0),
        })),
      };

      const id = await window.api.purchases.create(input);
      savedInvoiceId.current = id;

      if (confirmAfterSave) {
        await window.api.purchases.confirm(id);
      }
      onSaved();
    } catch (err) {
      setError(`${ar.purchases.errors.saveFailed}: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  useEffect(
    () =>
      attachShortcuts([
        { id: 'cancel', code: 'Escape', run: onCancel },
        { id: 'addRow', code: 'F12', run: () => setLines((prev) => [...prev, newLine()]) },
      ]),
    [onCancel]
  );

  return (
    <div className="item-form">
      <div className="item-form__toolbar">
        <button type="button" className="btn btn--primary" onClick={() => void submit(false)} disabled={saving}>
          {ar.purchases.save}
        </button>
        <button type="button" className="btn btn--primary" onClick={() => void submit(true)} disabled={saving}>
          {ar.purchases.confirm}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          {ar.items.actions.cancel}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      <p className="hint">{ar.purchases.confirmWarning}</p>

      <div className="panel">
        <div className="grid2">
          <label className="formfield" style={{ position: 'relative' }}>
            <span className="formfield__label">
              {ar.purchases.supplier}
              <span className="req"> *</span>
            </span>
            <input
              className="field"
              value={supplierQuery}
              placeholder={ar.purchases.supplierSearch}
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
                      {s.nameAr} <span dir="ltr">#{s.code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>

          {supplier && (
            <div className="formfield">
              <span className="formfield__label">{ar.purchases.supplierBalance}</span>
              <span dir="ltr" style={{ fontWeight: 600 }}>
                {supplierBalance === null ? '—' : fromPiastres(supplierBalance)}
              </span>
            </div>
          )}

          <label className="formfield">
            <span className="formfield__label">
              {ar.purchases.warehouse}
              <span className="req"> *</span>
            </span>
            <select
              className="field"
              value={warehouseId ?? ''}
              onChange={(e) => setWarehouseId(Number(e.target.value))}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nameAr}
                </option>
              ))}
            </select>
          </label>

          <label className="formfield">
            <span className="formfield__label">{ar.purchases.purchaseType}</span>
            <select
              className="field"
              value={purchaseType}
              onChange={(e) => setPurchaseType(e.target.value as 'cash' | 'credit')}
            >
              <option value="cash">{ar.purchases.cash}</option>
              <option value="credit">{ar.purchases.credit}</option>
            </select>
          </label>

          <label className="formfield">
            <span className="formfield__label">{ar.purchases.supplierInvoiceNo}</span>
            <input
              className="field"
              dir="ltr"
              value={supplierInvoiceNo}
              onChange={(e) => setSupplierInvoiceNo(e.target.value)}
            />
          </label>

          <label className="formfield">
            <span className="formfield__label">{ar.purchases.invoiceDate}</span>
            <input
              className="field"
              type="date"
              dir="ltr"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </label>
        </div>

        <fieldset className="fieldset">
          <legend>{ar.items.tabs.pricing}</legend>
          <table className="subtable">
            <thead>
              <tr>
                <th style={{ minWidth: '12rem' }}>{ar.purchases.grid.item}</th>
                <th>{ar.purchases.grid.qty}</th>
                <th>{ar.purchases.grid.bonus}</th>
                <th>{ar.purchases.grid.batchNumber}</th>
                <th>{ar.purchases.grid.expiryDate}</th>
                <th>{ar.purchases.grid.price}</th>
                <th>{ar.purchases.grid.discount}</th>
                <th>{ar.purchases.grid.tax}</th>
                <th>{ar.purchases.grid.landedCost}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.key}>
                  <td style={{ position: 'relative' }}>
                    <input
                      className="field"
                      value={line.itemQuery}
                      onChange={(e) => searchItemsForLine(line.key, e.target.value)}
                    />
                    {line.itemResults.length > 0 && (
                      <ul className="autocomplete">
                        {line.itemResults.map((it) => (
                          <li key={it.id}>
                            <button type="button" onClick={() => selectItemForLine(line.key, it)}>
                              {it.nameAr}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <input
                      className="field"
                      dir="ltr"
                      inputMode="decimal"
                      value={line.qtyInUnit}
                      onChange={(e) => updateLine(line.key, { qtyInUnit: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="field"
                      dir="ltr"
                      inputMode="decimal"
                      value={line.bonusInUnit}
                      onChange={(e) => updateLine(line.key, { bonusInUnit: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="field"
                      dir="ltr"
                      value={line.batchNumber}
                      onChange={(e) => updateLine(line.key, { batchNumber: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="field"
                      type="date"
                      dir="ltr"
                      value={line.expiryDate}
                      onChange={(e) => updateLine(line.key, { expiryDate: e.target.value })}
                    />
                  </td>
                  <td>
                    <MoneyInput
                      value={line.unitPurchasePrice}
                      onChange={(v) => updateLine(line.key, { unitPurchasePrice: v })}
                    />
                  </td>
                  <td>
                    <input
                      className="field"
                      dir="ltr"
                      inputMode="decimal"
                      value={line.discountPct}
                      onChange={(e) => updateLine(line.key, { discountPct: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="field"
                      dir="ltr"
                      inputMode="decimal"
                      value={line.taxPct}
                      onChange={(e) => updateLine(line.key, { taxPct: e.target.value })}
                    />
                  </td>
                  <td dir="ltr" className="center">
                    {preview.costs.has(line.key) ? fromPiastres(preview.costs.get(line.key)!) : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      disabled={lines.length === 1}
                    >
                      {ar.purchases.grid.remove}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="btn btn--sm" onClick={() => setLines((prev) => [...prev, newLine()])}>
            {ar.items.actions.addRow}
          </button>
        </fieldset>

        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.purchases.expenses}</span>
            <MoneyInput value={expenses} onChange={setExpenses} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.purchases.extraDiscountAmt}</span>
            <MoneyInput value={extraDiscountAmt} onChange={setExtraDiscountAmt} />
          </label>
          <label className="formfield span2">
            <span className="formfield__label">{ar.purchases.notes}</span>
            <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="stats" style={{ marginBlockStart: '0.75rem' }}>
          <Stat label={ar.purchases.subtotal} value={preview.subtotal} />
          <Stat label={ar.purchases.total} value={preview.total} good />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: number; good?: boolean }) {
  return (
    <div className={good ? 'stat stat--good' : 'stat'}>
      <span className="stat__value" dir="ltr">
        {fromPiastres(value)}
      </span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
