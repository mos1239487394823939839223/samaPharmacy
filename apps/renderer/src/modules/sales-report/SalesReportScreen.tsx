/**
 * تقارير المبيعات — spec M9's first bullet: date-range sales summary with
 * invoice-list drill-down. Only confirmed invoices count (getSalesReport
 * enforces this at the query level); cost_total is the batch-cost snapshot
 * taken at sale time, so profit here reflects what was actually paid for the
 * stock sold, not a current or average cost.
 */

import { useEffect, useState } from 'react';
import type { SalesReportRow, SalesReportInvoiceRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { Stat } from '../../components/Stat';
import { EmptyState, TableSkeleton } from '../../components/EmptyState';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function SalesReportScreen() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState<SalesReportRow | null>(null);
  const [invoices, setInvoices] = useState<SalesReportInvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    // An inverted range isn't rejected by getSalesReport — the query's own
    // WHERE clause just matches nothing, so the user would see "0 invoices"
    // and read that as "no sales happened" rather than "your date range is
    // backwards." Caught here instead of letting that ambiguity through.
    if (from > to) {
      setError(ar.salesReport.errors.invalidRange);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summary, list] = await Promise.all([
        window.api.salesReport.summary(from, to),
        window.api.salesReport.invoices(from, to),
      ]);
      setReport(summary);
      setInvoices(list);
    } catch (err) {
      setError(`${ar.salesReport.errors.loadFailed}: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(days: number) {
    setFrom(daysAgoIso(days));
    setTo(todayIso());
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.salesReport.fromDate}</span>
            <input className="field" type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.salesReport.toDate}</span>
            <input className="field" type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--sm" onClick={() => applyPreset(0)}>
            {ar.salesReport.today}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => applyPreset(7)}>
            {ar.salesReport.thisWeek}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => applyPreset(30)}>
            {ar.salesReport.thisMonth}
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void load()}>
            {ar.salesReport.apply}
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <TableSkeleton cols={5} />
      ) : report ? (
        <>
          <div className="stats">
            <Stat label={ar.salesReport.invoiceCount} value={String(report.invoiceCount)} neutral />
            <Stat label={ar.salesReport.cashTotal} value={fromPiastres(report.cashTotal)} />
            <Stat label={ar.salesReport.creditTotal} value={fromPiastres(report.creditTotal)} />
            <Stat label={ar.salesReport.grandTotal} value={fromPiastres(report.grandTotal)} good />
            <Stat label={ar.salesReport.grossProfit} value={fromPiastres(report.grossProfit)} good />
          </div>

          <div className="panel">
            <h2 className="section-heading">{ar.salesReport.invoiceList}</h2>
            {invoices.length === 0 ? (
              <EmptyState title={ar.salesReport.empty} />
            ) : (
              <table className="datatable">
                <thead>
                  <tr>
                    <th>{ar.salesReport.serial}</th>
                    <th>{ar.salesReport.type}</th>
                    <th>{ar.salesReport.total}</th>
                    <th>{ar.salesReport.profit}</th>
                    <th>{ar.salesReport.confirmedAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td dir="ltr">{inv.serial}</td>
                      <td>{inv.invoiceType === 'cash' ? ar.salesReport.cash : ar.salesReport.credit}</td>
                      <td dir="ltr">{fromPiastres(inv.total)}</td>
                      <td dir="ltr">{fromPiastres(inv.total - inv.costTotal)}</td>
                      <td dir="ltr">{inv.confirmedAt?.slice(0, 16) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
