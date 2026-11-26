/**
 * مرتجعات فواتير الشراء — find a confirmed purchase invoice by serial and
 * send stock back to its supplier, in any unit (box, strip, tablet). The cap
 * is what is still on the shelf in that batch (some may already have sold);
 * the value is the batch's landed cost and is deducted from what the
 * pharmacy owes the supplier.
 */

import { useState } from 'react';
import type { PurchaseInvoiceRow, ReturnablePurchaseLine } from '@pharmacy/shared';
import { fromPiastres, toAsciiDigits, fromPiastresGrouped } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { useToast } from '../../components/Toast';
import { Stat } from '../../components/Stat';
import { errorText } from '../../lib/errors';
import { baseQty, describeQty, loadUnits, type UnitOption } from '../../lib/units';
import { SearchInput } from '../../components/SearchInput';
import { EmptyState } from '../../components/EmptyState';

interface DraftLine extends ReturnablePurchaseLine {
  units: UnitOption[];
  returnUnitId: number;
  returnQty: string;
}

const unitOf = (l: DraftLine) => l.units.find((u) => u.id === l.returnUnitId);

export function PurchaseReturnByInvoiceScreen() {
  const [serial, setSerial] = useState('');
  const [invoice, setInvoice] = useState<PurchaseInvoiceRow | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** The return just saved — offered for printing until the next one. */
  const [lastReturnId, setLastReturnId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  async function findInvoice() {
    if (!window.api || !serial.trim()) return;
    setError(null);
    setInvoice(null);
    setLines([]);
    try {
      const serialNum = Number(serial.trim());
      const match = Number.isInteger(serialNum) ? await window.api.purchases.getBySerial(serialNum) : null;
      if (!match) return setError(ar.purchaseReturns.notFound);
      setInvoice(match);
      if (match.status !== 'confirmed') return;

      const returnable = (await window.api.purchaseReturns.returnableLines(match.id)).filter((l) => l.batchId);
      const unitsByItem = new Map<number, UnitOption[]>();
      for (const id of new Set(returnable.map((l) => l.itemId))) unitsByItem.set(id, await loadUnits(id));
      setLines(
        returnable.map((l) => ({ ...l, units: unitsByItem.get(l.itemId) ?? [], returnUnitId: l.unitId, returnQty: '' }))
      );
    } catch (err) {
      setError(errorText(err));
    }
  }

  function updateLine(batchId: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.batchId === batchId ? { ...l, ...patch } : l)));
  }

  const chosen = lines.filter((l) => baseQty(l.returnQty, unitOf(l)) !== 0);
  const valueTotal = chosen.reduce((s, l) => s + (baseQty(l.returnQty, unitOf(l)) ?? 0) * l.unitCost, 0);

  async function submit() {
    if (!window.api || !invoice || saving) return;
    setError(null);
    if (chosen.length === 0) return setError(ar.purchaseReturns.errors.noLines);
    for (const l of chosen) {
      const base = baseQty(l.returnQty, unitOf(l));
      if (base === null) return setError(ar.purchaseReturns.errors.qtyNotWhole);
      if (base > (l.batchQtyOnHand ?? 0)) return setError(ar.purchaseReturns.errors.qtyExceedsOnHand);
    }

    setSaving(true);
    try {
      const returnId = await window.api.purchaseReturns.create({
        sourceInvoiceId: invoice.id,
        supplierId: invoice.supplierId,
        warehouseId: invoice.warehouseId,
        reason: reason.trim() || null,
        lines: chosen.map((l) => ({
          itemId: l.itemId,
          batchId: l.batchId,
          unitId: l.returnUnitId,
          qtyInUnit: Number(toAsciiDigits(l.returnQty)),
        })),
      });
      setLastReturnId(returnId);
      const created = await window.api.purchaseReturns.get(returnId);
      showToast(ar.purchaseReturns.confirmed.replace('{serial}', String(created?.serial ?? returnId)));
      setInvoice(null);
      setLines([]);
      setSerial('');
      setReason('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="items">
      <div className="items__bar">
        <SearchInput
          className="field items__search"
          placeholder={ar.purchaseReturns.invoiceSerial}
          dir="ltr"
          autoFocus
          value={serial}
          onChange={(e) => setSerial(toAsciiDigits(e.target.value))}
          onKeyDown={(e) => (e.code === 'Enter' || e.code === 'NumpadEnter') && void findInvoice()}
        />
        <button type="button" className="btn btn--primary" onClick={() => void findInvoice()}>
          {ar.purchaseReturns.load}
        </button>
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
      {!invoice && !error && <EmptyState title={ar.purchaseReturns.lookupTitle} hint={ar.purchaseReturns.lookupHint} />}
      {invoice && invoice.status !== 'confirmed' && <div className="alert alert--error">{ar.purchaseReturns.notConfirmed}</div>}

      {invoice && invoice.status === 'confirmed' && (
        <>
          <div className="table-wrap"><table className="subtable">
            <thead>
              <tr>
                <th>{ar.items.fields.nameAr}</th>
                <th>{ar.purchaseReturns.receivedQty}</th>
                <th>{ar.purchaseReturns.onHandQty}</th>
                <th>{ar.purchaseReturns.unit}</th>
                <th>{ar.purchaseReturns.returnQty}</th>
                <th>{ar.purchaseReturns.value}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const base = baseQty(l.returnQty, unitOf(l));
                const invalid = base === null || (base !== 0 && base > (l.batchQtyOnHand ?? 0));
                return (
                  <tr key={l.batchId}>
                    <td>{l.itemNameAr}</td>
                    <td>{describeQty(l.receivedQtyBase, l.units)}</td>
                    <td>{describeQty(l.batchQtyOnHand ?? 0, l.units)}</td>
                    <td>
                      <select
                        className="field field--sm"
                        value={l.returnUnitId}
                        disabled={(l.batchQtyOnHand ?? 0) <= 0}
                        onChange={(e) => updateLine(l.batchId, { returnUnitId: Number(e.target.value) })}
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
                        className={invalid ? 'field field--sm field--invalid' : 'field field--sm'}
                        dir="ltr"
                        inputMode="decimal"
                        value={l.returnQty}
                        disabled={(l.batchQtyOnHand ?? 0) <= 0}
                        onChange={(e) => updateLine(l.batchId, { returnQty: toAsciiDigits(e.target.value) })}
                      />
                    </td>
                    <td dir="ltr">{base ? fromPiastresGrouped(base * l.unitCost) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>

          <label className="formfield formfield--narrow mt">
            <span className="formfield__label">{ar.purchaseReturns.reason}</span>
            <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>

          <div className="stats mt">
            <Stat label={ar.purchaseReturns.valueTotal} value={fromPiastresGrouped(valueTotal)} good />
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn--primary" disabled={saving || chosen.length === 0} onClick={() => void submit()}>
              {ar.purchaseReturns.confirm}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
