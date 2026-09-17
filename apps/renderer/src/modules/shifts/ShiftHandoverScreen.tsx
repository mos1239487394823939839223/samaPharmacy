/**
 * تسليم الدرج — screen 9. Open a shift with a declared float, record cash
 * movements during it, and close by comparing counted cash against what the
 * system expects from confirmed cash sales plus movements (BR-10: once
 * closed, this screen no longer allows any change to it).
 */

import { useEffect, useState } from 'react';
import type { ShiftRow, ShiftSalesSummary, CashTransactionRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { Stat } from '../../components/Stat';
import { useToast } from '../../components/Toast';

export function ShiftHandoverScreen() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState('');
  const [shift, setShift] = useState<ShiftRow | null>(null);
  const [summary, setSummary] = useState<ShiftSalesSummary | null>(null);
  const [transactions, setTransactions] = useState<CashTransactionRow[]>([]);
  const [expectedCash, setExpectedCash] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const [openingFloat, setOpeningFloat] = useState<number | null>(null);
  const [txDirection, setTxDirection] = useState<'in' | 'out'>('out');
  const [txAmount, setTxAmount] = useState<number | null>(null);
  const [txCategory, setTxCategory] = useState('');
  const [countedCash, setCountedCash] = useState<number | null>(null);
  const [varianceNote, setVarianceNote] = useState('');

  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const warehouses = await window.api.warehouses.list();
      const def = warehouses.find((w) => w.isDefault) ?? warehouses[0];
      if (!def) return;
      setWarehouseId(def.id);
      setWarehouseName(def.nameAr);

      const open = await window.api.shifts.getOpen(def.id);
      setShift(open);
      if (open) {
        const [s, tx, expected] = await Promise.all([
          window.api.shifts.salesSummary(open.id),
          window.api.shifts.cashTransactions(open.id),
          window.api.shifts.computeExpectedCash(open.id),
        ]);
        setSummary(s);
        setTransactions(tx);
        setExpectedCash(expected);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleOpen() {
    if (!window.api || !warehouseId) return;
    setError(null);
    if (openingFloat !== null && openingFloat < 0) return setError(ar.shifts.errors.negativeAmount);
    try {
      await window.api.shifts.open(warehouseId, openingFloat ?? 0);
      setOpeningFloat(null);
      await load();
    } catch (err) {
      setError(`${ar.shifts.errors.openFailed}: ${(err as Error).message}`);
    }
  }

  async function handleAddCash() {
    if (!window.api || !shift || txAmount === null || txAmount <= 0) return;
    setError(null);
    try {
      // recordCash's 4th/5th params are category/note — this screen has no
      // category selector, only the single "ملاحظة" field, which belongs in
      // note. Passing it as category left the note column always null and
      // put free text where a category taxonomy was meant to go.
      await window.api.shifts.recordCash(shift.id, txDirection, txAmount, null, txCategory.trim() || null);
      setTxAmount(null);
      setTxCategory('');
      await load();
    } catch (err) {
      setError(`${ar.shifts.errors.cashTxFailed}: ${(err as Error).message}`);
    }
  }

  async function handleClose() {
    if (!window.api || !shift || countedCash === null) return;
    setError(null);
    if (countedCash < 0) return setError(ar.shifts.errors.negativeAmount);
    // closeShift (packages/db/src/repositories/shifts.ts) rejects a non-zero
    // variance with no note, but throws a raw English RangeError — checked
    // here first so the pharmacist sees the Arabic message that already sits
    // unused in the i18n file instead of that raw error.
    const variance = countedCash - (expectedCash ?? 0);
    if (variance !== 0 && !varianceNote.trim()) return setError(ar.shifts.varianceRequired);
    try {
      await window.api.shifts.close(shift.id, {
        countedCash,
        varianceNote: varianceNote.trim() || null,
      });
      showToast(ar.shifts.closed);
      setCountedCash(null);
      setVarianceNote('');
      await load();
    } catch (err) {
      setError(`${ar.shifts.errors.closeFailed}: ${(err as Error).message}`);
    }
  }

  if (loading) return <p className="muted">{ar.items.loading}</p>;

  if (!shift) {
    return (
      <div className="stack">
        {error && <div className="alert alert--error">{error}</div>}
        <div className="panel stack">
          <p className="muted">{ar.shifts.noOpenShift}</p>
          <div className="grid2">
            <label className="formfield">
              <span className="formfield__label">{ar.shifts.warehouse}</span>
              <input className="field" value={warehouseName} disabled />
            </label>
            <label className="formfield">
              <span className="formfield__label">{ar.shifts.openingFloat}</span>
              <MoneyInput value={openingFloat} onChange={setOpeningFloat} />
            </label>
          </div>
          <div className="btn-row" style={{ marginBlockStart: 0 }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleOpen()}
              disabled={openingFloat !== null && openingFloat < 0}
            >
              {ar.shifts.openShift}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const previewVariance = countedCash !== null && expectedCash !== null ? countedCash - expectedCash : null;

  return (
    <div className="stack">
      {error && <div className="alert alert--error">{error}</div>}

      <div className="panel">
        <div className="stats">
          <Stat label={ar.shifts.openingFloat} value={fromPiastres(shift.openingFloat)} neutral />
          <Stat label={ar.shifts.cashSalesCount} value={String(summary?.count ?? 0)} neutral />
          <Stat label={ar.shifts.cashTotal} value={fromPiastres(summary?.cashTotal ?? 0)} good />
          <Stat label={ar.shifts.creditTotal} value={fromPiastres(summary?.creditTotal ?? 0)} neutral />
          <Stat label={ar.shifts.expectedCash} value={fromPiastres(expectedCash ?? 0)} good />
        </div>
        <p className="muted small" dir="ltr" style={{ marginBlockStart: 'var(--space-3)' }}>
          {ar.shifts.openedAt}: {shift.openedAt.slice(0, 16)}
        </p>
      </div>

      <fieldset className="fieldset" style={{ marginBlockStart: 0 }}>
        <legend>{ar.shifts.transactionsTitle}</legend>
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.shifts.category}</span>
            <select className="field" value={txDirection} onChange={(e) => setTxDirection(e.target.value as 'in' | 'out')}>
              <option value="out">{ar.shifts.cashOut}</option>
              <option value="in">{ar.shifts.cashIn}</option>
            </select>
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.shifts.amount}</span>
            <MoneyInput value={txAmount} onChange={setTxAmount} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.shifts.note}</span>
            <input className="field" value={txCategory} onChange={(e) => setTxCategory(e.target.value)} />
          </label>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--sm" onClick={() => void handleAddCash()}>
            {ar.shifts.addTransaction}
          </button>
        </div>
      </fieldset>

      {transactions.length > 0 && (
        <div className="panel">
          <h2 className="section-heading">{ar.shifts.transactionsLog}</h2>
          <table className="datatable">
            <thead>
              <tr>
                <th>{ar.purchases.invoiceDate}</th>
                <th>{ar.shifts.category}</th>
                <th>{ar.shifts.amount}</th>
                <th>{ar.shifts.note}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td dir="ltr">{t.at.slice(0, 16)}</td>
                  <td>{t.direction === 'in' ? ar.shifts.cashIn : ar.shifts.cashOut}</td>
                  <td dir="ltr">{fromPiastres(t.amount)}</td>
                  <td>{t.category ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <fieldset className="fieldset" style={{ marginBlockStart: 0 }}>
        <legend>{ar.shifts.closeShift}</legend>
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.shifts.countedCash}</span>
            <MoneyInput value={countedCash} onChange={setCountedCash} />
          </label>
          {previewVariance !== null && previewVariance !== 0 && (
            <label className="formfield span2">
              <span className="formfield__label">
                {ar.shifts.varianceNote}
                <span className="req"> *</span> ({ar.shifts.variance}: {fromPiastres(previewVariance)})
              </span>
              <input className="field" value={varianceNote} onChange={(e) => setVarianceNote(e.target.value)} />
            </label>
          )}
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleClose()}
            disabled={
              countedCash === null ||
              countedCash < 0 ||
              (previewVariance !== null && previewVariance !== 0 && !varianceNote.trim())
            }
          >
            {ar.shifts.closeShift}
          </button>
        </div>
      </fieldset>
    </div>
  );
}
