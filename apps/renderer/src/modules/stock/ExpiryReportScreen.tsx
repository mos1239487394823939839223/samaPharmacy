/**
 * لوحة الصلاحية — spec's expiry dashboard (docs/pharmacy-system-spec.md line
 * 110): every batch with stock on hand, bucketed by days remaining as of a
 * chosen date, valued at cost. Clicking a bucket tile filters the batch list
 * to that bucket; the summary tiles themselves always show every bucket so
 * totals stay visible regardless of which one is selected.
 */

import { useEffect, useState } from 'react';
import type { ExpiryBucket, ExpiryReport } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';

const BUCKETS: ExpiryBucket[] = ['expired', 'd30', 'd60', 'd90', 'd180', 'over180'];

const BUCKET_LABELS: Record<ExpiryBucket, string> = {
  expired: ar.expiryReport.bucketExpired,
  d30: ar.expiryReport.bucketD30,
  d60: ar.expiryReport.bucketD60,
  d90: ar.expiryReport.bucketD90,
  d180: ar.expiryReport.bucketD180,
  over180: ar.expiryReport.bucketOver180,
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExpiryReportScreen() {
  const [asOf, setAsOf] = useState(todayIso());
  const [report, setReport] = useState<ExpiryReport | null>(null);
  const [bucketFilter, setBucketFilter] = useState<ExpiryBucket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setReport(await window.api.stock.expiryReport(asOf));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = report ? (bucketFilter ? report.rows.filter((r) => r.bucket === bucketFilter) : report.rows) : [];

  return (
    <div className="items">
      <div className="panel">
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.expiryReport.asOf}</span>
            <input className="field" type="date" dir="ltr" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: '0.75rem' }}>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void load()}>
            {ar.expiryReport.apply}
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <p className="muted">{ar.items.loading}</p>
      ) : report ? (
        <>
          <div className="stats" style={{ marginBlockStart: '1rem' }}>
            <button
              type="button"
              className={`stat-btn${bucketFilter === null ? ' stat-btn--active' : ''}`}
              onClick={() => setBucketFilter(null)}
            >
              <Stat
                label={ar.expiryReport.allBuckets}
                value={String(report.summary.reduce((s, b) => s + b.batchCount, 0))}
              />
            </button>
            {BUCKETS.map((bucket) => {
              const s = report.summary.find((x) => x.bucket === bucket)!;
              return (
                <button
                  key={bucket}
                  type="button"
                  className={`stat-btn${bucketFilter === bucket ? ' stat-btn--active' : ''}`}
                  onClick={() => setBucketFilter(bucket)}
                >
                  <Stat
                    label={BUCKET_LABELS[bucket]}
                    value={`${s.batchCount} / ${fromPiastres(s.value)}`}
                    good={bucket === 'over180' || bucket === 'd180'}
                    bad={bucket === 'expired'}
                  />
                </button>
              );
            })}
          </div>

          <fieldset className="fieldset" style={{ marginBlockStart: '1rem' }}>
            <legend>{ar.expiryReport.tableTitle}</legend>
            {rows.length === 0 ? (
              <p className="muted">{ar.expiryReport.empty}</p>
            ) : (
              <table className="subtable">
                <thead>
                  <tr>
                    <th>{ar.expiryReport.code}</th>
                    <th>{ar.expiryReport.itemName}</th>
                    <th>{ar.expiryReport.batchNumber}</th>
                    <th>{ar.expiryReport.expiryDate}</th>
                    <th>{ar.expiryReport.qtyOnHand}</th>
                    <th>{ar.expiryReport.unitCost}</th>
                    <th>{ar.expiryReport.value}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.batchId}>
                      <td dir="ltr">{r.code}</td>
                      <td>{r.nameAr}</td>
                      <td dir="ltr">{r.batchNumber ?? '—'}</td>
                      <td dir="ltr">{r.expiryDate}</td>
                      <td dir="ltr">{r.qtyOnHand}</td>
                      <td dir="ltr">{fromPiastres(r.unitCost)}</td>
                      <td dir="ltr">{fromPiastres(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </fieldset>
        </>
      ) : null}
    </div>
  );
}

function Stat({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className={bad ? 'stat stat--bad' : good ? 'stat stat--good' : 'stat'}>
      <span className="stat__value" dir="ltr">
        {value}
      </span>
      <span className="stat__label">{label}</span>
    </div>
  );
}
