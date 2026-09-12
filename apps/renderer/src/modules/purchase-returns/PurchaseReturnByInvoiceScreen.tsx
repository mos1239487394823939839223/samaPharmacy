/**
 * مرتجعات فواتير الشراء — look up a purchase invoice by serial, select
 * lines and quantities to return to the supplier. Availability is capped by
 * current qty_on_hand, not by what was originally received: some of it may
 * have already sold.
 */

import { useState } from 'react';
import type { ReturnablePurchaseLine } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';

interface DraftLine extends ReturnablePurchaseLine {
  returnQty: string;
}

export function PurchaseReturnByInvoiceScreen() {
  const [serial, setSerial] = useState('');
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function findInvoice() {
    if (!window.api || !serial.trim()) return;
    setError(null);
    setNotice(null);
    try {
      const all = await window.api.purchases.list({ limit: 500 });
      const match = all.find((inv) => String(inv.serial) === serial.trim());
      if (!match) return setError(ar.salesReturns.notFound);

      setInvoiceId(match.id);
      setSupplierId(match.supplierId);
      setWarehouseId(match.warehouseId);
      const returnable = await window.api.purchaseReturns.returnableLines(match.id);
      setLines(returnable.map((l) => ({ ...l, returnQty: '' })));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function updateLine(batchId: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.batchId === batchId ? { ...l, ...patch } : l)));
  }

  async function submit() {
    if (!window.api || !supplierId || !warehouseId) return;
    setError(null);

    const toReturn = lines.filter((l) => Number(l.returnQty) > 0);
    if (toReturn.length === 0) return setError(ar.purchaseReturns.errors.noLines);

    try {
      const returnId = await window.api.purchaseReturns.create({
        sourceInvoiceId: invoiceId,
        supplierId,
        warehouseId,
        reason: reason.trim() || null,
        lines: toReturn.map((l) => ({
          itemId: l.itemId,
          batchId: l.batchId,
          unitId: l.unitId,
          qtyInUnit: Number(l.returnQty),
          qtyBase: Number(l.returnQty),
        })),
      });
      const created = await window.api.purchaseReturns.get(returnId);
      setNotice(ar.purchaseReturns.confirmed.replace('{serial}', String(created?.serial ?? returnId)));
      setInvoiceId(null);
      setLines([]);
      setSerial('');
    } catch (err) {
      setError(`${ar.purchaseReturns.errors.createFailed}: ${(err as Error).message}`);
    }
  }

  return (
    <div className="items">
      <div className="items__bar">
        <input
          className="field items__search"
          placeholder={ar.purchaseReturns.invoiceSerial}
          dir="ltr"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void findInvoice()}
        />
        <button type="button" className="btn btn--primary" onClick={() => void findInvoice()}>
          {ar.purchaseReturns.load}
        </button>
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

      {invoiceId && (
        <>
          <table className="subtable">
            <thead>
              <tr>
                <th>{ar.items.fields.nameAr}</th>
                <th>{ar.purchaseReturns.receivedQty}</th>
                <th>{ar.purchaseReturns.onHandQty}</th>
                <th>{ar.purchaseReturns.alreadyReturned}</th>
                <th>{ar.purchaseReturns.returnQty}</th>
                <th>{ar.purchaseReturns.unitCost}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.batchId}>
                  <td>{l.itemNameAr}</td>
                  <td dir="ltr">{l.receivedQtyBase}</td>
                  <td dir="ltr">{l.batchQtyOnHand ?? '—'}</td>
                  <td dir="ltr">{l.alreadyReturnedQtyBase}</td>
                  <td>
                    <input
                      className="field"
                      dir="ltr"
                      style={{ maxInlineSize: '5rem' }}
                      inputMode="numeric"
                      value={l.returnQty}
                      onChange={(e) => updateLine(l.batchId, { returnQty: e.target.value })}
                    />
                  </td>
                  <td dir="ltr">{fromPiastres(l.unitCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <label className="formfield" style={{ marginBlockStart: '1rem', maxInlineSize: '24rem' }}>
            <span className="formfield__label">{ar.purchaseReturns.reason}</span>
            <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>

          <button type="button" className="btn btn--primary" style={{ marginBlockStart: '1rem' }} onClick={() => void submit()}>
            {ar.purchaseReturns.confirm}
          </button>
        </>
      )}
    </div>
  );
}
