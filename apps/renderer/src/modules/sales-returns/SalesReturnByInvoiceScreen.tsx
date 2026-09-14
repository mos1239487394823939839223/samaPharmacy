/**
 * مرتجع فواتير البيع — look up a sales invoice by serial, select lines and
 * quantities to return. No approval required: the source invoice is itself
 * the authorization.
 */

import { useState } from 'react';
import type { ReturnableLine } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { useToast } from '../../components/Toast';

interface DraftLine extends ReturnableLine {
  returnQty: string;
  damaged: boolean;
}

export function SalesReturnByInvoiceScreen() {
  const [serial, setSerial] = useState('');
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [refundMethod, setRefundMethod] = useState<'cash' | 'credit_note' | 'account'>('cash');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function findInvoice() {
    if (!window.api || !serial.trim()) return;
    setError(null);
    try {
      // list() has no serial filter yet; fetch a page and match client-side —
      // acceptable at this scale, a dedicated lookup can follow later.
      const all = await window.api.sales.list({ limit: 500 });
      const match = all.find((inv) => String(inv.serial) === serial.trim());
      if (!match) return setError(ar.salesReturns.notFound);

      setInvoiceId(match.id);
      setWarehouseId(match.warehouseId);
      setCustomerId(match.customerId);
      const returnable = await window.api.salesReturns.returnableLines(match.id);
      setLines(returnable.map((l) => ({ ...l, returnQty: '', damaged: false })));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function updateLine(sourceLineId: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.sourceLineId === sourceLineId ? { ...l, ...patch } : l)));
  }

  async function submit() {
    if (!window.api || !invoiceId || !warehouseId) return;
    setError(null);

    const toReturn = lines.filter((l) => Number(l.returnQty) > 0);
    if (toReturn.length === 0) return setError(ar.salesReturns.errors.noLines);

    try {
      const returnId = await window.api.salesReturns.create({
        sourceInvoiceId: invoiceId,
        warehouseId,
        customerId,
        refundMethod,
        reason: reason.trim() || null,
        lines: toReturn.map((l) => ({
          itemId: l.itemId,
          batchId: l.batchId,
          unitId: l.unitId,
          qtyInUnit: Number(l.returnQty),
          qtyBase: Number(l.returnQty),
          unitPrice: l.unitPrice,
          sourceLineId: l.sourceLineId,
          damaged: l.damaged,
        })),
      });
      const created = await window.api.salesReturns.get(returnId);
      showToast(ar.salesReturns.confirmed.replace('{serial}', String(created?.serial ?? returnId)));
      setInvoiceId(null);
      setLines([]);
      setSerial('');
    } catch (err) {
      setError(`${ar.salesReturns.errors.createFailed}: ${(err as Error).message}`);
    }
  }

  return (
    <div className="items">
      <div className="items__bar">
        <input
          className="field items__search"
          placeholder={ar.salesReturns.invoiceSerial}
          dir="ltr"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void findInvoice()}
        />
        <button type="button" className="btn btn--primary" onClick={() => void findInvoice()}>
          {ar.salesReturns.load}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {invoiceId && (
        <>
          <p className="hint">{ar.salesReturns.quarantineNotice}</p>
          <table className="subtable">
            <thead>
              <tr>
                <th>{ar.items.fields.nameAr}</th>
                <th>{ar.salesReturns.soldQty}</th>
                <th>{ar.salesReturns.alreadyReturned}</th>
                <th>{ar.salesReturns.returnQty}</th>
                <th>{ar.salesReturns.unitPrice}</th>
                <th>{ar.salesReturns.damaged}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const remaining = l.soldQtyBase - l.alreadyReturnedQtyBase;
                return (
                  <tr key={l.sourceLineId}>
                    <td>{l.itemNameAr}</td>
                    <td dir="ltr">{l.soldQtyBase}</td>
                    <td dir="ltr">{l.alreadyReturnedQtyBase}</td>
                    <td>
                      <input
                        className="field field--sm"
                        dir="ltr"
                        inputMode="numeric"
                        value={l.returnQty}
                        onChange={(e) => updateLine(l.sourceLineId, { returnQty: e.target.value })}
                        max={remaining}
                      />
                    </td>
                    <td dir="ltr">{fromPiastres(l.unitPrice)}</td>
                    <td className="center">
                      <input
                        type="checkbox"
                        checked={l.damaged}
                        onChange={(e) => updateLine(l.sourceLineId, { damaged: e.target.checked })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="grid2 mt">
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

          <div className="btn-row">
            <button type="button" className="btn btn--primary" onClick={() => void submit()}>
              {ar.salesReturns.confirm}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
