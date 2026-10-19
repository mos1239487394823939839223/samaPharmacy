/**
 * سجل العمليات — read-only view of audit_log: who did what, when, and the
 * record before/after. Append-only in the database (migration 0009).
 */

import { Fragment, useEffect, useState } from 'react';
import type { AuditRow } from '@pharmacy/shared';
import { addDays, todayLocal } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { errorText } from '../../lib/errors';
import { exportCsv } from '../../lib/csv';
import { useToast } from '../../components/Toast';

function pretty(json: string | null): string {
  if (!json) return '—';
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export function AuditScreen() {
  const [from, setFrom] = useState(() => addDays(todayLocal(), -7));
  const [to, setTo] = useState(() => todayLocal());
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

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
      [ar.audit.at, ar.audit.action, ar.audit.entity, ar.audit.record, ar.audit.note],
      rows.map((r) => [r.at, r.action, r.entity, r.entityId ?? '', r.note ?? ''])
    );
    if (msg) showToast(msg, 'info');
  }

  return (
    <div className="stack">
      <p className="hint">{ar.audit.intro}</p>
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

      {rows.length === 0 ? (
        <p className="muted">{ar.audit.empty}</p>
      ) : (
        <div className="table-wrap"><table className="datatable">
          <thead>
            <tr>
              <th>{ar.audit.at}</th>
              <th>{ar.audit.action}</th>
              <th>{ar.audit.record}</th>
              <th>{ar.audit.note}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr onClick={() => setOpen(open === r.id ? null : r.id)} style={{ cursor: 'pointer' }}>
                  <td dir="ltr">{r.at}</td>
                  <td dir="ltr">{r.action}</td>
                  <td dir="ltr">{r.entityId ?? '—'}</td>
                  <td>{r.note ?? ''}</td>
                </tr>
                {open === r.id && (
                  <tr>
                    <td colSpan={4}>
                      <div className="grid2">
                        <div>
                          <strong>{ar.audit.before}</strong>
                          <pre dir="ltr" className="small">{pretty(r.beforeJson)}</pre>
                        </div>
                        <div>
                          <strong>{ar.audit.after}</strong>
                          <pre dir="ltr" className="small">{pretty(r.afterJson)}</pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}
