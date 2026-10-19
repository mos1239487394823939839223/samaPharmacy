/**
 * فواتير الشراء — list plus form host.
 */

import { useEffect, useState } from 'react';
import type { PurchaseInvoiceRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { PurchaseForm } from './PurchaseForm';
import { EmptyState, TableSkeleton } from '../../components/EmptyState';
import { errorText } from '../../lib/errors';
import { useToast } from '../../components/Toast';

type Mode = { view: 'list' } | { view: 'form' };

const STATUS_LABEL: Record<string, string> = {
  draft: ar.purchases.statusDraft,
  held: ar.purchases.statusHeld,
  confirmed: ar.purchases.statusConfirmed,
  voided: ar.purchases.statusVoided,
};

const STATUS_BADGE: Record<string, string> = {
  draft: 'badge badge--muted',
  held: 'badge badge--warning',
  confirmed: 'badge badge--success',
  voided: 'badge badge--error',
};

export function PurchasesScreen() {
  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const [rows, setRows] = useState<PurchaseInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { showToast } = useToast();

  async function printInvoice(id: number) {
    try {
      await window.api!.print.document('purchase', id);
    } catch (err) {
      setError(errorText(err));
    }
  }

  /** A saved draft can be confirmed (stock enters) or voided (abandoned) from the list. */
  async function act(row: PurchaseInvoiceRow, action: 'confirm' | 'void') {
    if (!window.api || busyId) return;
    if (action === 'void' && !window.confirm(ar.purchases.voidConfirm)) return;
    setError(null);
    setBusyId(row.id);
    try {
      if (action === 'confirm') await window.api.purchases.confirm(row.id);
      else await window.api.purchases.voidInvoice(row.id);
      showToast(action === 'confirm' ? ar.purchases.confirmedToast : ar.purchases.voidedToast);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusyId(null);
    }
  }

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
      setError(`${ar.purchases.errors.loadFailed}: ${errorText(err)}`);
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
        <TableSkeleton cols={6} />
      ) : rows.length === 0 ? (
        <EmptyState title={ar.purchases.empty} />
      ) : (
        <div className="table-wrap"><table className="datatable">
          <thead>
            <tr>
              <th>{ar.purchases.serial}</th>
              <th>{ar.purchases.supplierInvoiceNo}</th>
              <th>{ar.purchases.invoiceDate}</th>
              <th>{ar.purchases.status}</th>
              <th>{ar.purchases.total}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td dir="ltr">{r.serial}</td>
                <td dir="ltr">{r.supplierInvoiceNo}</td>
                <td dir="ltr">{r.invoiceDate}</td>
                <td>
                  <span className={STATUS_BADGE[r.status] ?? 'badge badge--muted'}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </td>
                <td dir="ltr">{fromPiastres(r.total)}</td>
                <td className="datatable__actions">
                  <button type="button" className="btn btn--sm" onClick={() => void printInvoice(r.id)}>
                    {ar.print.a4}
                  </button>
                  {r.status === 'draft' && (
                    <div className="btn-row" style={{ marginBlockStart: 0 }}>
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        disabled={busyId === r.id}
                        onClick={() => void act(r, 'confirm')}
                      >
                        {ar.purchases.confirm}
                      </button>
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        disabled={busyId === r.id}
                        onClick={() => void act(r, 'void')}
                      >
                        {ar.purchases.voidDraft}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
