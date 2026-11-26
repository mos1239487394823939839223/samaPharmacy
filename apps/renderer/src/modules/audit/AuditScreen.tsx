/**
 * سجل العمليات — read-only view of audit_log: who did what, when, and the
 * record before/after. Append-only in the database (migration 0009).
 */

import { Fragment, useEffect, useMemo, useState } from 'react';
import type { AuditRow } from '@pharmacy/shared';
import { addDays, todayLocal } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { errorText } from '../../lib/errors';
import { exportCsv } from '../../lib/csv';
import { useToast } from '../../components/Toast';
import { SearchInput } from '../../components/SearchInput';
import { describeAudit, type AuditLine } from './describe';

export function AuditScreen() {
  const [from, setFrom] = useState(() => addDays(todayLocal(), -7));
  const [to, setTo] = useState(() => todayLocal());
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const [filter, setFilter] = useState('');
  const views = useMemo(() => rows.map((r) => ({ row: r, view: describeAudit(r) })), [rows]);
  const shown = useMemo(() => {
    const f = filter.trim();
    if (!f) return views;
    return views.filter(({ view }) => [view.title, view.section, view.subject, view.note ?? ''].some((x) => x.includes(f)));
  }, [views, filter]);

  async function load() {
    setError(null);
    try {
      setRows(await window.api!.audit.list({ from, to, limit: 1000 }));
    } catch (err) {
      setError(errorText(err));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportRows() {
    const msg = await exportCsv(
      `audit-${from}-${to}.csv`,
      [ar.audit.at, ar.audit.action, ar.audit.section, ar.audit.subject, ar.audit.details, ar.audit.note],
      shown.map(({ row, view }) => [
        row.at, view.title, view.section, view.subject,
        view.after.map((l) => `${l.label}: ${l.value}`).join(' | '), view.note ?? '',
      ])
    );
    if (msg) showToast(msg, 'info');
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.audit.from}</span>
            <input className="field" type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.audit.to}</span>
            <input className="field" type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void load()}>
            {ar.audit.apply}
          </button>
          <button type="button" className="btn btn--sm" disabled={rows.length === 0} onClick={() => void exportRows()}>
            {ar.exportCsv.button}
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {rows.length > 0 && (
        <SearchInput className="field" placeholder={ar.audit.filterPlaceholder} value={filter} onChange={(e) => setFilter(e.target.value)} />
      )}

      {shown.length === 0 ? (
        <p className="muted">{ar.audit.empty}</p>
      ) : (
        <div className="table-wrap">
          <table className="datatable">
            <thead>
              <tr>
                <th>{ar.audit.at}</th>
                <th>{ar.audit.action}</th>
                <th>{ar.audit.subject}</th>
                <th>{ar.audit.details}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shown.map(({ row, view }) => {
                const hasMore = view.before.length > 0 || view.after.length > 3;
                return (
                  <Fragment key={row.id}>
                    <tr>
                      <td dir="ltr">{row.at.replace('T', ' ').slice(0, 16)}</td>
                      <td>
                        <span className="strong">{view.title}</span>
                        <div className="muted small">{view.section}</div>
                      </td>
                      <td>{view.subject}</td>
                      <td className="small">
                        {view.after.length === 0
                          ? view.note ?? '—'
                          : view.after.slice(0, 3).map((l) => (
                              <div key={l.label}>
                                <span className="muted">{l.label}:</span> {l.value}
                              </div>
                            ))}
                        {view.note && view.after.length > 0 && <div className="muted">{view.note}</div>}
                      </td>
                      <td>
                        {hasMore && (
                          <button type="button" className="btn btn--sm" onClick={() => setOpen(open === row.id ? null : row.id)}>
                            {open === row.id ? ar.audit.hideDetails : ar.audit.showDetails}
                          </button>
                        )}
                      </td>
                    </tr>
                    {open === row.id && (
                      <tr>
                        <td colSpan={5}>
                          <div className="grid2">
                            <AuditLines title={ar.audit.before} lines={view.before} />
                            <AuditLines title={ar.audit.after} lines={view.after} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AuditLines({ title, lines }: { title: string; lines: AuditLine[] }) {
  return (
    <div>
      <strong>{title}</strong>
      {lines.length === 0 ? (
        <p className="muted small">{ar.audit.noDetails}</p>
      ) : (
        <dl className="audit-lines">
          {lines.map((l) => (
            <Fragment key={l.label}>
              <dt>{l.label}</dt>
              <dd>{l.value}</dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  );
}
