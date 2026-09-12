/**
 * فواتير الشراء — list plus form host.
 */

import { useEffect, useState } from 'react';
import type { PurchaseInvoiceRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { PurchaseForm } from './PurchaseForm';

type Mode = { view: 'list' } | { view: 'form' };

const STATUS_LABEL: Record<string, string> = {
  draft: ar.purchases.statusDraft,
  held: ar.purchases.statusHeld,
  confirmed: ar.purchases.statusConfirmed,
  voided: ar.purchases.statusVoided,
};

export function PurchasesScreen() {
  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const [rows, setRows] = useState<PurchaseInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await window.api.purchases.list({ limit: 200 }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode.view === 'list') void load();
  }, [mode.view]);

  if (mode.view === 'form') {
    return (
      <PurchaseForm onSaved={() => setMode({ view: 'list' })} onCancel={() => setMode({ view: 'list' })} />
    );
  }

  return (
    <div className="items">
      <div className="items__bar">
        <button type="button" className="btn btn--primary" onClick={() => setMode({ view: 'form' })}>
          {ar.purchases.add}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <p className="muted">{ar.items.loading}</p>
      ) : rows.length === 0 ? (
        <p className="muted">{ar.purchases.empty}</p>
      ) : (
        <table className="datatable">
          <thead>
            <tr>
              <th>{ar.purchases.serial}</th>
              <th>{ar.purchases.supplierInvoiceNo}</th>
              <th>{ar.purchases.invoiceDate}</th>
              <th>{ar.purchases.status}</th>
              <th>{ar.purchases.total}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td dir="ltr">{r.serial}</td>
                <td dir="ltr">{r.supplierInvoiceNo}</td>
                <td dir="ltr">{r.invoiceDate}</td>
                <td>
                  <span className={r.status === 'confirmed' ? 'badge' : 'badge badge--muted'}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td dir="ltr">{fromPiastres(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
