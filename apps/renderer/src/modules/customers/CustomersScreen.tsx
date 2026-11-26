/**
 * العملاء — list plus form, blueprint §1.5. The full CRM form (B2B fields,
 * addresses, tags, demographics) lives in CustomerForm below.
 */

import { useEffect, useRef, useState } from 'react';
import type { CustomerDetail, CustomerRow } from '@pharmacy/shared';
import { fromPiastres, fromPiastresGrouped } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { CustomerForm } from './CustomerForm';
import { EmptyState, TableSkeleton } from '../../components/EmptyState';
import { errorText } from '../../lib/errors';
import { SearchInput } from '../../components/SearchInput';

type Mode = { view: 'list' } | { view: 'create' } | { view: 'edit'; customer: CustomerDetail };

export function CustomersScreen({ initialQuery }: { initialQuery?: string } = {}) {
  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [query, setQuery] = useState(initialQuery ?? '');
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
      setError(`${ar.customers.errors.loadFailed}: ${errorText(err)}`);
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
    try {
      if (row.isSuspended) await window.api.customers.unsuspend(row.id);
      else await window.api.customers.suspend(row.id);
      void load(query);
    } catch (err) {
      setError(`${ar.customers.errors.suspendFailed}: ${errorText(err)}`);
    }
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
        <SearchInput
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
        <TableSkeleton cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={query.trim() ? ar.customers.noResults : ar.customers.empty}
          hint={query.trim() ? undefined : ar.emptyHints.customers}
          action={
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setMode({ view: 'create' })}>
              {ar.customers.add}
            </button>
          }
        />
      ) : (
        <div className="table-wrap"><table className="datatable">
          <thead>
            <tr>
              <th>{ar.customers.name}</th>
              <th>{ar.customers.mobile1}</th>
              <th>{ar.customers.paymentMethod}</th>
              <th className="num">{ar.customers.balance}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onDoubleClick={() => void openEdit(r.id)}>
                <td>
                  <div className="itemlist__name">
                    {r.name}
                    {Boolean(r.isVip) && <span className="badge badge--info"> VIP</span>}
                    {Boolean(r.isSuspended) && <span className="badge badge--warning"> {ar.customers.suspended}</span>}
                  </div>
                  <div className="itemlist__meta">
                    <span dir="ltr" className="itemlist__code">#{r.code}</span>
                  </div>
                </td>
                <td dir="ltr" className="muted">{r.mobile1}</td>
                <td>{r.paymentMethod === 'credit' ? ar.customers.credit : ar.customers.cash}</td>
                <td dir="ltr" className={r.balance > 0 ? 'num strong' : 'num muted'}>{fromPiastresGrouped(r.balance)}</td>
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
        </table></div>
      )}
    </div>
  );
}
