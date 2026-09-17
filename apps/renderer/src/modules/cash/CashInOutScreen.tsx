/**
 * صرف وتوريد نقدية — record a manual cash movement (petty expense, safe
 * transfer, refund) against the currently open shift.
 *
 * This does not open or close a shift itself — that is ShiftHandoverScreen's
 * job — it only records movements against whatever shift is already open,
 * the same recordCashTransaction the shift screen uses. Kept as its own
 * screen under الحسابات per the drawer tree, since a petty-cash disbursement
 * is conceptually an accounts operation even though it happens to affect the
 * same shift total.
 */

import { useEffect, useState } from 'react';
import type { ShiftRow, CashTransactionRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { Stat } from '../../components/Stat';
import { useToast } from '../../components/Toast';
import { EmptyState } from '../../components/EmptyState';

const CATEGORIES = [
  { value: 'petty_cash', label: ar.cashInOut.categories.pettyCash },
  { value: 'safe_transfer', label: ar.cashInOut.categories.safeTransfer },
  { value: 'safe_topup', label: ar.cashInOut.categories.safeTopup },
  { value: 'refund', label: ar.cashInOut.categories.refund },
  { value: 'other', label: ar.cashInOut.categories.other },
];

export function CashInOutScreen() {
  const [shift, setShift] = useState<ShiftRow | null>(null);
  const [warehouseName, setWarehouseName] = useState('');
  const [expectedCash, setExpectedCash] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CashTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [amount, setAmount] = useState<number | null>(null);
  const [category, setCategory] = useState(CATEGORIES[0]!.value);
  const [note, setNote] = useState('');

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
      setWarehouseName(def.nameAr);

      const open = await window.api.shifts.getOpen(def.id);
      setShift(open);
      if (open) {
        const [expected, tx] = await Promise.all([
          window.api.shifts.computeExpectedCash(open.id),
          window.api.shifts.cashTransactions(open.id),
        ]);
        setExpectedCash(expected);
        setTransactions(tx);
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

  async function submit() {
    if (!window.api || !shift) return;
    setError(null);
    if (amount === null || amount <= 0) return setError(ar.cashInOut.errors.invalidAmount);

    try {
      await window.api.shifts.recordCash(shift.id, direction, amount, category, note.trim() || null);
      showToast(direction === 'in' ? ar.cashInOut.cashIn : ar.cashInOut.cashOut);
      setAmount(null);
      setNote('');
      await load();
    } catch (err) {
      const message = (err as Error).message;
      // recordCashTransaction (packages/db/src/repositories/shifts.ts) rejects
      // a movement against a shift closed since this screen loaded it — a
      // real race if the shift is closed from ShiftHandoverScreen without
      // this screen reloading. Caught by message shape since the boundary
      // flattens every thrown error to a bare string (db-process/index.ts).
      setError(
        /is closed \(rule 9\/BR-10\)/.test(message)
          ? ar.cashInOut.errors.shiftClosed
          : `${ar.cashInOut.errors.submitFailed}: ${message}`
      );
    }
  }

  if (loading) return <p className="muted">{ar.items.loading}</p>;

  if (!shift) {
    return (
      <div className="stack">
        {error && <div className="alert alert--error">{error}</div>}
        <p className="muted">{ar.cashInOut.noOpenShift}</p>
      </div>
    );
  }

  return (
    <div className="stack">
      {error && <div className="alert alert--error">{error}</div>}

      <div className="panel">
        <div className="stats">
          <Stat label={ar.cashInOut.warehouse} value={warehouseName} neutral />
          <Stat label={ar.cashInOut.expectedCash} value={fromPiastres(expectedCash ?? 0)} good />
        </div>
      </div>

      <fieldset className="fieldset" style={{ marginBlockStart: 0 }}>
        <legend>{ar.cashInOut.title}</legend>
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.cashInOut.direction}</span>
            <select className="field" value={direction} onChange={(e) => setDirection(e.target.value as 'in' | 'out')}>
              <option value="out">{ar.cashInOut.cashOut}</option>
              <option value="in">{ar.cashInOut.cashIn}</option>
            </select>
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.cashInOut.amount}</span>
            <MoneyInput value={amount} onChange={setAmount} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.cashInOut.category}</span>
            <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.cashInOut.note}</span>
            <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" onClick={() => void submit()}>
            {ar.cashInOut.submit}
          </button>
        </div>
      </fieldset>

      <div className="panel">
        <h2 className="section-heading">{ar.cashInOut.history}</h2>
        {transactions.length === 0 ? (
          <EmptyState title={ar.cashInOut.empty} />
        ) : (
          <table className="datatable">
            <thead>
              <tr>
                <th>{ar.purchases.invoiceDate}</th>
                <th>{ar.cashInOut.direction}</th>
                <th>{ar.cashInOut.amount}</th>
                <th>{ar.cashInOut.category}</th>
                <th>{ar.cashInOut.note}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td dir="ltr">{t.at.slice(0, 16)}</td>
                  <td>{t.direction === 'in' ? ar.cashInOut.cashIn : ar.cashInOut.cashOut}</td>
                  <td dir="ltr">{fromPiastres(t.amount)}</td>
                  <td>{t.category ?? '—'}</td>
                  <td>{t.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
