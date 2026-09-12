/**
 * العملاء — list plus form, blueprint §1.5. The full CRM form (B2B fields,
 * addresses, tags, demographics) lives in CustomerForm below.
 */

import { useEffect, useRef, useState } from 'react';
import type { CustomerDetail, CustomerRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { CustomerForm } from './CustomerForm';

type Mode = { view: 'list' } | { view: 'create' } | { view: 'edit'; customer: CustomerDetail };

export function CustomersScreen() {
  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  async function load(q: string) {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(q.trim() ? await window.api.customers.search(q, 200) : await window.api.customers.list());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode.view === 'list') void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.view]);

  useEffect(() => {
    if (mode.view !== 'list') return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(query), 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function openEdit(id: number) {
    if (!window.api) return;
    const customer = await window.api.customers.get(id);
    if (customer) setMode({ view: 'edit', customer });
  }

  async function toggleSuspend(row: CustomerRow) {
    if (!window.api) return;
    if (!row.isSuspended && !confirm(ar.customers.confirmSuspend)) return;
    if (row.isSuspended) await window.api.customers.unsuspend(row.id);
    else await window.api.customers.suspend(row.id);
    void load(query);
  }

  if (mode.view === 'create' || mode.view === 'edit') {
    return (
      <CustomerForm
        existing={mode.view === 'edit' ? mode.customer : null}
        onSaved={() => setMode({ view: 'list' })}
        onCancel={() => setMode({ view: 'list' })}
      />
    );
  }

  return (
    <div className="items">
      <div className="items__bar">
        <input
          className="field items__search"
          placeholder={ar.customers.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="btn btn--primary" onClick={() => setMode({ view: 'create' })}>
          {ar.customers.add}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <p className="muted">{ar.items.loading}</p>
      ) : rows.length === 0 ? (
        <p className="muted">{query.trim() ? ar.customers.noResults : ar.customers.empty}</p>
      ) : (
        <table className="datatable">
          <thead>
            <tr>
              <th>{ar.customers.code}</th>
              <th>{ar.customers.name}</th>
              <th>{ar.customers.mobile1}</th>
              <th>{ar.customers.paymentMethod}</th>
              <th>{ar.customers.balance}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onDoubleClick={() => void openEdit(r.id)}>
                <td dir="ltr">{r.code}</td>
                <td>
                  {r.name}
                  {Boolean(r.isVip) && <span className="badge"> VIP</span>}
                  {Boolean(r.isSuspended) && <span className="badge badge--muted"> {ar.customers.suspended}</span>}
                </td>
                <td dir="ltr">{r.mobile1}</td>
                <td>{r.paymentMethod === 'credit' ? ar.customers.credit : ar.customers.cash}</td>
                <td dir="ltr">{fromPiastres(r.openingBalance)}</td>
                <td className="datatable__actions">
                  <button type="button" className="btn btn--sm" onClick={() => void openEdit(r.id)}>
                    {ar.customers.edit}
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => void toggleSuspend(r)}>
                    {r.isSuspended ? ar.customers.unsuspend : ar.customers.suspend}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
