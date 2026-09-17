/**
 * لوحة الصلاحية — spec's expiry dashboard (docs/pharmacy-system-spec.md line
 * 110): every batch with stock on hand, bucketed by days remaining as of a
 * chosen date, valued at cost. Clicking a bucket tile filters the batch list
 * to that bucket; the summary tiles themselves always show every bucket so
 * totals stay visible regardless of which one is selected.
 */

import { useEffect, useState } from 'react';
import type { ExpiryBucket, ExpiryReport, ExpiryBucketDays } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { Stat } from '../../components/Stat';
import { EmptyState, TableSkeleton } from '../../components/EmptyState';

/** Badge color by urgency — expired is an error, the nearest bucket is a
    warning, everything further out reads as a neutral/success fact rather
    than something that needs action. */
function bucketBadgeClass(bucket: ExpiryBucket): string {
  if (bucket === 'expired') return 'badge badge--error';
  if (bucket === 'd30') return 'badge badge--warning';
  if (bucket === 'd60') return 'badge badge--info';
  return 'badge badge--muted';
}

const BUCKETS: ExpiryBucket[] = ['expired', 'd30', 'd60', 'd90', 'd180', 'over180'];

const fill = (template: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), template);

/**
 * Bucket tile text must track the configured thresholds (Settings → لوحة
 * الصلاحية), not a fixed "30/60/90/180" string — a middle bucket is the
 * range strictly between the previous and current threshold, so its label
 * has to be built from both, not just the one number that names the bucket.
 */
function bucketLabels(bucketDays: ExpiryBucketDays): Record<ExpiryBucket, string> {
  return {
    expired: ar.expiryReport.bucketExpired,
    d30: fill(ar.expiryReport.bucketWithin, { days: bucketDays.d30 }),
    d60: fill(ar.expiryReport.bucketBetween, { from: bucketDays.d30 + 1, to: bucketDays.d60 }),
    d90: fill(ar.expiryReport.bucketBetween, { from: bucketDays.d60 + 1, to: bucketDays.d90 }),
    d180: fill(ar.expiryReport.bucketBetween, { from: bucketDays.d90 + 1, to: bucketDays.d180 }),
    over180: fill(ar.expiryReport.bucketOver, { days: bucketDays.d180 }),
  };
}

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
      setError(`${ar.expiryReport.errors.loadFailed}: ${(err as Error).message}`);
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
    <div className="stack">
      <div className="panel">
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.expiryReport.asOf}</span>
            <input
              className="field field--date"
              type="date"
              dir="ltr"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </label>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void load()}>
            {ar.expiryReport.apply}
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <TableSkeleton cols={8} />
      ) : report ? (
        <>
          <div className="stats">
            <button
              type="button"
              className={`stat-btn${bucketFilter === null ? ' stat-btn--active' : ''}`}
              onClick={() => setBucketFilter(null)}
            >
              <Stat
                label={ar.expiryReport.allBuckets}
                value={String(report.summary.reduce((s, b) => s + b.batchCount, 0))}
                neutral
              />
            </button>
            {BUCKETS.map((bucket) => {
              const s = report.summary.find((x) => x.bucket === bucket)!;
              const labels = bucketLabels(report.bucketDays);
              return (
                <button
                  key={bucket}
                  type="button"
                  className={`stat-btn${bucketFilter === bucket ? ' stat-btn--active' : ''}`}
                  onClick={() => setBucketFilter(bucket)}
                >
                  <Stat
                    label={labels[bucket]}
                    value={`${s.batchCount} / ${fromPiastres(s.value)}`}
                    good={bucket === 'over180' || bucket === 'd180'}
                    bad={bucket === 'expired'}
                  />
                </button>
              );
            })}
          </div>

          <div className="panel">
            <h2 className="section-heading">{ar.expiryReport.tableTitle}</h2>
            {rows.length === 0 ? (
              <EmptyState title={ar.expiryReport.empty} />
            ) : (
              <table className="datatable">
                <thead>
                  <tr>
                    <th>{ar.expiryReport.code}</th>
                    <th>{ar.expiryReport.itemName}</th>
                    <th>{ar.expiryReport.batchNumber}</th>
                    <th>{ar.expiryReport.expiryDate}</th>
                    <th />
                    <th>{ar.expiryReport.qtyOnHand}</th>
                    <th>{ar.expiryReport.unitCost}</th>
                    <th>{ar.expiryReport.value}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const labels = bucketLabels(report.bucketDays);
                    return (
                      <tr key={r.batchId}>
                        <td dir="ltr">{r.code}</td>
                        <td>{r.nameAr}</td>
                        <td dir="ltr">{r.batchNumber ?? '—'}</td>
                        <td dir="ltr">{r.expiryDate}</td>
                        <td>
                          <span className={bucketBadgeClass(r.bucket)}>{labels[r.bucket]}</span>
                        </td>
                        <td dir="ltr">{r.qtyOnHand}</td>
                        <td dir="ltr">{fromPiastres(r.unitCost)}</td>
                        <td dir="ltr">{fromPiastres(r.value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
