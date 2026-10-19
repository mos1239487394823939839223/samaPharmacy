/**
 * مرتجع فواتير البيع — find the invoice by serial, choose what comes back
 * (any unit: box, strip or tablet) and see the exact refund before
 * confirming. The source invoice is itself the authorization.
 *
 * The refund shown here is a preview using the same rule as the server
 * (proRataShare of what the customer actually paid for the line, after every
 * discount); the server recomputes it and is the authority. The refund
 * method is not a choice: a cash invoice refunds cash, a credit invoice is
 * credited to the customer's account (decision D11).
 */

import { useState } from 'react';
import type { ReturnableLine, SalesInvoiceRow } from '@pharmacy/shared';
import { fromPiastres, proRataShare, toAsciiDigits, toBaseUnits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { useToast } from '../../components/Toast';
import { Stat } from '../../components/Stat';
import { errorText } from '../../lib/errors';
import { SearchInput } from '../../components/SearchInput';

interface UnitOption {
  id: number;
  nameAr: string;
  factor: number;
}

interface DraftLine extends ReturnableLine {
  units: UnitOption[];
  returnUnitId: number;
  returnQty: string;
  damaged: boolean;
}

function baseOf(line: DraftLine): number | null {
  const qty = Number(toAsciiDigits(line.returnQty));
  if (!line.returnQty.trim() || !Number.isFinite(qty) || qty <= 0) return 0;
  const unit = line.units.find((u) => u.id === line.returnUnitId);
  if (!unit) return null;
  try {
    return toBaseUnits(qty, unit.factor);
  } catch {
    return null;
  }
}

function refundOf(line: DraftLine): number {
  const base = baseOf(line);
  if (!base) return 0;
  const remaining = line.soldQtyBase - line.alreadyReturnedQtyBase;
  if (base > remaining) return 0;
  return proRataShare(line.netValue, line.alreadyReturnedQtyBase, base, line.soldQtyBase);
}

/** "1 علبة" / "10 قرص" — how much of the sold line is left, in its own unit when it divides evenly. */
function describe(base: number, units: UnitOption[]): string {
  const fit = [...units].sort((a, b) => b.factor - a.factor).find((u) => base >= u.factor && base % u.factor === 0);
  const unit = fit ?? units.find((u) => u.factor === 1) ?? units[units.length - 1];
  return unit ? `${base / unit.factor} ${unit.nameAr}` : String(base);
}

export function SalesReturnByInvoiceScreen() {
  const [serial, setSerial] = useState('');
  const [invoice, setInvoice] = useState<SalesInvoiceRow | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** The return just saved — offered for printing until the next one. */
  const [lastReturnId, setLastReturnId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  function reset() {
    setInvoice(null);
    setLines([]);
    setReason('');
  }

  async function findInvoice() {
    if (!window.api || !serial.trim()) return;
    setError(null);
    reset();
    try {
      const serialNum = Number(serial.trim());
      const match = Number.isInteger(serialNum) ? await window.api.sales.getBySerial(serialNum) : null;
      if (!match) return setError(ar.salesReturns.notFound);
      setInvoice(match);
      if (match.status !== 'confirmed') return;

      const returnable = await window.api.salesReturns.returnableLines(match.id);
      const details = await Promise.all([...new Set(returnable.map((l) => l.itemId))].map((id) => window.api!.items.get(id)));
      const unitsByItem = new Map(
        details.filter(Boolean).map((d) => [d!.id, d!.units.map((u) => ({ id: u.id, nameAr: u.nameAr, factor: u.factor }))])
      );
      setLines(
        returnable.map((l) => ({
          ...l,
          units: unitsByItem.get(l.itemId) ?? [{ id: l.unitId, nameAr: l.unitNameAr, factor: l.unitFactor }],
          returnUnitId: l.unitId,
          returnQty: '',
          damaged: false,
        }))
      );
    } catch (err) {
      setError(errorText(err));
    }
  }

  function updateLine(sourceLineId: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.sourceLineId === sourceLineId ? { ...l, ...patch } : l)));
  }

  const chosen = lines.filter((l) => baseOf(l) !== 0);
  const refundTotal = chosen.reduce((s, l) => s + refundOf(l), 0);

  async function submit() {
    if (!window.api || !invoice || saving) return;
    setError(null);
    if (chosen.length === 0) return setError(ar.salesReturns.errors.noLines);

    for (const l of chosen) {
      const base = baseOf(l);
      const unit = l.units.find((u) => u.id === l.returnUnitId);
      if (base === null) {
        return setError(ar.errors['return.qtyNotWhole'].replace('{qty}', l.returnQty).replace('{unit}', unit?.nameAr ?? ''));
      }
      if (base > l.soldQtyBase - l.alreadyReturnedQtyBase) {
        return setError(
          ar.errors['return.qtyExceedsRemaining']
            .replace('{item}', l.itemNameAr)
            .replace('{remaining}', String(l.soldQtyBase - l.alreadyReturnedQtyBase))
        );
      }
    }

    setSaving(true);
    try {
      const returnId = await window.api.salesReturns.create({
        sourceInvoiceId: invoice.id,
        warehouseId: invoice.warehouseId,
        reason: reason.trim() || null,
        lines: chosen.map((l) => ({
          sourceLineId: l.sourceLineId,
          unitId: l.returnUnitId,
          qtyInUnit: Number(toAsciiDigits(l.returnQty)),
          damaged: l.damaged,
        })),
      });
      setLastReturnId(returnId);
      const created = await window.api.salesReturns.get(returnId);
      showToast(ar.salesReturns.confirmed.replace('{serial}', String(created?.serial ?? returnId)));
      reset();
      setSerial('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const isCredit = invoice?.invoiceType === 'credit';

  return (
    <div className="items">
      <div className="items__bar">
        <SearchInput
          className="field items__search"
          placeholder={ar.salesReturns.invoiceSerial}
          dir="ltr"
          autoFocus
          value={serial}
          onChange={(e) => setSerial(toAsciiDigits(e.target.value))}
          onKeyDown={(e) => (e.code === 'Enter' || e.code === 'NumpadEnter') && void findInvoice()}
        />
        <button type="button" className="btn btn--primary" onClick={() => void findInvoice()}>
          {ar.salesReturns.load}
        </button>
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

      {invoice && (
        <p className="hint">
          {ar.salesReturns.invoiceInfo
            .replace('{serial}', String(invoice.serial))
            .replace('{type}', isCredit ? ar.sales.credit : ar.sales.cash)
            .replace('{date}', invoice.confirmedAt ?? invoice.createdAt)}
        </p>
      )}

      {invoice && invoice.status !== 'confirmed' && <div className="alert alert--error">{ar.salesReturns.notConfirmed}</div>}

      {invoice && invoice.status === 'confirmed' && (
        <>
          <p className="hint">{ar.salesReturns.quarantineNotice}</p>
          <div className="table-wrap"><table className="subtable">
            <thead>
              <tr>
                <th>{ar.items.fields.nameAr}</th>
                <th>{ar.salesReturns.soldQty}</th>
                <th>{ar.salesReturns.paid}</th>
                <th>{ar.salesReturns.remaining}</th>
                <th>{ar.salesReturns.unit}</th>
                <th>{ar.salesReturns.returnQty}</th>
                <th>{ar.salesReturns.refund}</th>
                <th>{ar.salesReturns.damaged}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const remaining = l.soldQtyBase - l.alreadyReturnedQtyBase;
                const base = baseOf(l);
                const invalid = base === null || (base !== 0 && base > remaining);
                return (
                  <tr key={l.sourceLineId}>
                    <td>{l.itemNameAr}</td>
                    <td>{describe(l.soldQtyBase, l.units)}</td>
                    <td dir="ltr">{fromPiastres(l.netValue)}</td>
                    <td>{remaining > 0 ? describe(remaining, l.units) : '—'}</td>
                    <td>
                      <select
                        className="field field--sm"
                        value={l.returnUnitId}
                        disabled={remaining <= 0}
                        onChange={(e) => updateLine(l.sourceLineId, { returnUnitId: Number(e.target.value) })}
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
                        disabled={remaining <= 0}
                        onChange={(e) => updateLine(l.sourceLineId, { returnQty: toAsciiDigits(e.target.value) })}
                      />
                    </td>
                    <td dir="ltr" className="strong">
                      {base ? fromPiastres(refundOf(l)) : '—'}
                    </td>
                    <td className="center">
                      <input
                        type="checkbox"
                        checked={l.damaged}
                        disabled={remaining <= 0}
                        onChange={(e) => updateLine(l.sourceLineId, { damaged: e.target.checked })}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>

          <div className="grid2 mt">
            <div className="formfield">
              <span className="formfield__label">{ar.salesReturns.refundMethod}</span>
              <span className="strong">{isCredit ? ar.salesReturns.refundAccountNote : ar.salesReturns.refundCashNote}</span>
            </div>
            <label className="formfield">
              <span className="formfield__label">{ar.salesReturns.reason}</span>
              <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} />
            </label>
          </div>

          <div className="stats mt">
            <Stat label={ar.salesReturns.refundTotal} value={fromPiastres(refundTotal)} good />
          </div>

          <div className="btn-row">
            <button type="button" className="btn btn--primary" disabled={saving || chosen.length === 0} onClick={() => void submit()}>
              {ar.salesReturns.confirm}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
