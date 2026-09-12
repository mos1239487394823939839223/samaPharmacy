/**
 * التقارير (customer) — search a customer, view balance and full ledger
 * history, record a payment against their account.
 */

import { useEffect, useRef, useState } from 'react';
import type { CustomerRow, CustomerLedgerRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';

type EntryTypeKey = keyof typeof ar.customers.entryTypes;

export function CustomerReportsScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerRow[]>([]);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [ledger, setLedger] = useState<CustomerLedgerRow[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!window.api || !query.trim()) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void window.api!.customers.search(query, 10).then(setResults);
    }, 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  async function selectCustomer(c: CustomerRow) {
    setSelected(c);
    setQuery('');
    setResults([]);
    await refresh(c.id);
  }

  async function refresh(customerId: number) {
    if (!window.api) return;
    const [bal, led] = await Promise.all([
      window.api.customers.balance(customerId),
      window.api.customers.ledger(customerId),
    ]);
    setBalance(bal);
    setLedger(led);
  }

  async function submitPayment() {
    if (!selected || !window.api || paymentAmount === null || paymentAmount <= 0) return;
    setError(null);
    try {
      await window.api.customers.recordPayment(selected.id, paymentAmount, paymentNote.trim() || null);
      setPaymentAmount(null);
      setPaymentNote('');
      await refresh(selected.id);
    } catch (err) {
      setError(`${ar.customers.errors.paymentFailed}: ${(err as Error).message}`);
    }
  }

  return (
    <div className="items">
      <div className="items__bar" style={{ position: 'relative' }}>
        <input
          className="field items__search"
          placeholder={ar.customers.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <ul className="autocomplete" style={{ top: '2.6rem', maxInlineSize: '24rem' }}>
            {results.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => void selectCustomer(c)}>
                  {c.name} <span dir="ltr">#{c.code}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {!selected ? (
        <p className="muted">{ar.customers.selectCustomer}</p>
      ) : (
        <>
          <div className="panel">
            <h2 style={{ margin: '0 0 0.75rem' }}>
              {selected.name} <span className="muted small" dir="ltr">#{selected.code}</span>
            </h2>
            <div className="stats">
              <Stat label={ar.customers.balance} value={fromPiastres(balance ?? 0)} good={(balance ?? 0) === 0} />
              <Stat
                label={ar.customers.creditLimit}
                value={selected.creditLimit === null ? ar.customers.noLimit : fromPiastres(selected.creditLimit)}
              />
            </div>

            <fieldset className="fieldset">
              <legend>{ar.customers.recordPayment}</legend>
              <div className="grid2">
                <label className="formfield">
                  <span className="formfield__label">{ar.customers.paymentAmount}</span>
                  <MoneyInput value={paymentAmount} onChange={setPaymentAmount} />
                </label>
                <label className="formfield">
                  <span className="formfield__label">{ar.customers.paymentNote}</span>
                  <input className="field" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
                </label>
              </div>
              <button type="button" className="btn btn--primary btn--sm" style={{ marginBlockStart: '0.5rem' }} onClick={() => void submitPayment()}>
                {ar.customers.recordPayment}
              </button>
            </fieldset>
          </div>

          <fieldset className="fieldset">
            <legend>{ar.customers.ledgerTitle}</legend>
            {ledger.length === 0 ? (
              <p className="muted">—</p>
            ) : (
              <table className="subtable">
                <thead>
                  <tr>
                    <th>{ar.customers.ledgerDate}</th>
                    <th>{ar.customers.ledgerType}</th>
                    <th>{ar.customers.ledgerDebit}</th>
                    <th>{ar.customers.ledgerCredit}</th>
                    <th>{ar.customers.ledgerBalance}</th>
                    <th>{ar.customers.notes}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.id}>
                      <td dir="ltr">{l.at.slice(0, 16)}</td>
                      <td>{ar.customers.entryTypes[l.entryType as EntryTypeKey] ?? l.entryType}</td>
                      <td dir="ltr">{l.debit ? fromPiastres(l.debit) : '—'}</td>
                      <td dir="ltr">{l.credit ? fromPiastres(l.credit) : '—'}</td>
                      <td dir="ltr">{fromPiastres(l.balanceAfter)}</td>
                      <td>{l.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>
        </>
      )}
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
