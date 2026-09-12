/**
 * تسليم الدرج — screen 9. Open a shift with a declared float, record cash
 * movements during it, and close by comparing counted cash against what the
 * system expects from confirmed cash sales plus movements (BR-10: once
 * closed, this screen no longer allows any change to it).
 */

import { useEffect, useState } from 'react';
import type { ShiftRow, ShiftSalesSummary, CashTransactionRow } from '@pharmacy/shared';
import { fromPiastres, toPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';

export function ShiftHandoverScreen() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState('');
  const [shift, setShift] = useState<ShiftRow | null>(null);
  const [summary, setSummary] = useState<ShiftSalesSummary | null>(null);
  const [transactions, setTransactions] = useState<CashTransactionRow[]>([]);
  const [expectedCash, setExpectedCash] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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
      await window.api.shifts.recordCash(shift.id, txDirection, txAmount, txCategory.trim() || null);
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
    try {
      await window.api.shifts.close(shift.id, {
        countedCash,
        varianceNote: varianceNote.trim() || null,
      });
      setNotice(ar.shifts.closed);
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
      <div className="items">
        {error && <div className="alert alert--error">{error}</div>}
        <div className="panel">
          <p className="muted">{ar.shifts.noOpenShift}</p>
          <div className="grid2" style={{ marginBlockStart: '1rem' }}>
            <label className="formfield">
              <span className="formfield__label">{ar.shifts.warehouse}</span>
              <input className="field" value={warehouseName} disabled />
            </label>
            <label className="formfield">
              <span className="formfield__label">{ar.shifts.openingFloat}</span>
              <MoneyInput value={openingFloat} onChange={setOpeningFloat} />
            </label>
          </div>
          <button type="button" className="btn btn--primary" style={{ marginBlockStart: '1rem' }} onClick={() => void handleOpen()}>
            {ar.shifts.openShift}
          </button>
        </div>
      </div>
    );
  }

  const previewVariance = countedCash !== null && expectedCash !== null ? countedCash - expectedCash : null;

  return (
    <div className="items">
      {error && <div className="alert alert--error">{error}</div>}
      {notice && (
        <div className="alert alert--info">
          {notice}
          <button type="button" className="alert__close" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      <div className="panel">
        <div className="stats">
          <Stat label={ar.shifts.openingFloat} value={fromPiastres(shift.openingFloat)} />
          <Stat label={ar.shifts.cashSalesCount} value={String(summary?.count ?? 0)} />
          <Stat label={ar.shifts.cashTotal} value={fromPiastres(summary?.cashTotal ?? 0)} good />
          <Stat label={ar.shifts.creditTotal} value={fromPiastres(summary?.creditTotal ?? 0)} />
          <Stat label={ar.shifts.expectedCash} value={fromPiastres(expectedCash ?? 0)} good />
        </div>
        <p className="muted small" dir="ltr">
          {ar.shifts.openedAt}: {shift.openedAt.slice(0, 16)}
        </p>
      </div>

      <fieldset className="fieldset">
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
        <button type="button" className="btn btn--sm" style={{ marginBlockStart: '0.5rem' }} onClick={() => void handleAddCash()}>
          {ar.shifts.addTransaction}
        </button>

        {transactions.length > 0 && (
          <table className="subtable" style={{ marginBlockStart: '0.75rem' }}>
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
        )}
      </fieldset>

      <fieldset className="fieldset">
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
        <button
          type="button"
          className="btn btn--primary"
          style={{ marginBlockStart: '0.75rem' }}
          onClick={() => void handleClose()}
          disabled={countedCash === null}
        >
          {ar.shifts.closeShift}
        </button>
      </fieldset>
    </div>
  );
}

function Stat({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className={good ? 'stat stat--good' : 'stat'}>
      <span className="stat__value" dir="ltr">
        {value}
      </span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
