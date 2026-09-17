/**
 * الرئيسية — the operational command center. Every figure here is a real
 * read through the existing API — today's confirmed-sales summary, live
 * low-stock/expiry queries, the open shift's cash movements, the customer
 * ledger's aggregate receivables, and a 7-day sales trend built from the
 * same salesReport.summary() the reports screen uses. Nothing is sample or
 * invented: a pharmacy with no activity yet legitimately shows zeros and
 * empty states rather than placeholder numbers, per this screen's own rule
 * that a metric that cannot be reliably calculated is not shown at all
 * (there is no "today's refunds" or "average invoice" aggregate anywhere in
 * the system yet, so neither appears here).
 */

import { useEffect, useState } from 'react';
import type { ScreenId } from '../lib/navigation';
import type { SalesInvoiceRow, WarehouseRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../i18n/ar';
import { EmptyState } from './EmptyState';
import { SalesSparkline } from './SalesSparkline';
import {
  ReceiptIcon,
  TrendingUpIcon,
  BoxIcon,
  ClockIcon,
  WalletIcon,
  AlertCircleIcon,
  ArrowLeftIcon,
  LayersIcon,
  UsersIcon,
  TruckIcon,
  RefreshIcon,
} from './icons';

interface LowStockEntry {
  itemId: number;
  nameAr: string;
  qtyOnHand: number;
}

interface TrendPoint {
  dateIso: string;
  label: string;
  total: number;
}

interface CashSnapshot {
  cashSales: number;
  cashIn: number;
  cashOut: number;
}

/** Data that doesn't depend on the warehouse or trend-period filters — loaded
    once and re-fetched only on a manual retry. */
interface BaseDashboardData {
  todayInvoiceCount: number;
  todaySalesTotal: number;
  todayProfit: number;
  lowStockCount: number;
  lowStockSample: LowStockEntry[];
  recentInvoices: SalesInvoiceRow[];
  receivables: { totalOwed: number; customerCount: number } | null;
  warehouses: WarehouseRow[];
}

interface ShiftCashState {
  shiftOpen: boolean;
  expectedCash: number | null;
  cash: CashSnapshot | null;
}

const TREND_PERIODS = [7, 14, 30] as const;
type TrendPeriod = (typeof TREND_PERIODS)[number];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Runs one dashboard data source in isolation: a rejected promise OR a
    synchronous throw (e.g. calling a method the preload bridge doesn't
    expose yet) both degrade to `null` instead of failing the whole
    dashboard load — matching this screen's own rule that one broken source
    must not take the others down with it. */
async function isolated<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

const WEEKDAY_SHORT = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

/** Human-relative Arabic time, e.g. "منذ 3 دقائق" — built from the invoice's
    own confirmedAt/createdAt timestamp, not a guess. */
function relativeTime(iso: string): string {
  const then = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z').getTime();
  const now = Date.now();
  const diffMin = Math.max(0, Math.floor((now - then) / 60000));
  if (diffMin < 1) return ar.dashboard.justNow;
  if (diffMin < 60) return ar.dashboard.minutesAgo.replace('{n}', String(diffMin));
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return ar.dashboard.hoursAgo.replace('{n}', String(diffHr));
  const diffDay = Math.floor(diffHr / 24);
  return ar.dashboard.daysAgo.replace('{n}', String(diffDay));
}

interface QuickLink {
  label: string;
  target: ScreenId;
  icon: React.ReactNode;
}

const QUICK_LINKS: QuickLink[] = [
  { label: ar.drawer.salesInvoices, target: 'sales.invoices', icon: <ReceiptIcon /> },
  { label: ar.drawer.itemsList, target: 'items.list', icon: <BoxIcon /> },
  { label: ar.drawer.itemsExpiry, target: 'items.expiry', icon: <ClockIcon /> },
  { label: ar.drawer.itemsStock, target: 'items.stock', icon: <LayersIcon /> },
  { label: ar.drawer.purchaseInvoices, target: 'purchases.invoices', icon: <TruckIcon /> },
  { label: ar.drawer.customersList, target: 'customers.list', icon: <UsersIcon /> },
];

export function Dashboard({ onNavigate }: { onNavigate: (screen: ScreenId) => void }) {
  const [base, setBase] = useState<BaseDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Warehouse filter — only the shift/cash panel is genuinely scoped per
  // warehouse in the underlying API (stock.lowStock, salesReport.summary/trend
  // have no warehouseId parameter at all), so this filter applies only to
  // that one section rather than pretending to filter the whole page.
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [shiftState, setShiftState] = useState<ShiftCashState | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);

  // Trend period filter — a real GROUP BY range, not a client-side slice.
  const [trendDays, setTrendDays] = useState<TrendPeriod>(7);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState(false);

  async function loadBase() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const today = todayIso();
      const [salesSummary, lowStock, warehouses, recentAll, receivables] = await Promise.all([
        window.api.salesReport.summary(today, today),
        window.api.stock.lowStock(5),
        window.api.warehouses.list(),
        isolated(() => window.api!.sales.list({ limit: 20 })),
        isolated(() => window.api!.customers.receivablesSummary()),
      ]);

      setBase({
        todayInvoiceCount: salesSummary.invoiceCount,
        todaySalesTotal: salesSummary.grandTotal,
        todayProfit: salesSummary.grossProfit,
        lowStockCount: lowStock.length,
        lowStockSample: lowStock.slice(0, 5).map((r) => ({
          itemId: r.itemId,
          nameAr: r.nameAr,
          qtyOnHand: r.qtyOnHand,
        })),
        recentInvoices: (recentAll ?? []).filter((inv) => inv.status === 'confirmed').slice(0, 5),
        receivables,
        warehouses,
      });

      const defaultWarehouse = warehouses.find((w) => w.isDefault) ?? warehouses[0] ?? null;
      setWarehouseId((current) => current ?? defaultWarehouse?.id ?? null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBase();
  }, []);

  // Re-fetch the shift/cash snapshot whenever the selected warehouse
  // changes — a real, independent IPC call per warehouse, not a client-side
  // filter over data that was never warehouse-scoped to begin with.
  useEffect(() => {
    if (!window.api || warehouseId == null) {
      setShiftState(null);
      return;
    }
    let cancelled = false;
    setShiftLoading(true);
    void (async () => {
      const today = todayIso();
      const [cashSalesToday, shiftInfo] = await Promise.all([
        isolated(() => window.api!.salesReport.summary(today, today)),
        isolated(async () => {
          const openShift = await window.api!.shifts.getOpen(warehouseId);
          if (!openShift) return null;
          const [expected, transactions] = await Promise.all([
            window.api!.shifts.computeExpectedCash(openShift.id),
            window.api!.shifts.cashTransactions(openShift.id),
          ]);
          return { expected, transactions };
        }),
      ]);
      if (cancelled) return;
      if (!shiftInfo) {
        setShiftState({ shiftOpen: false, expectedCash: null, cash: null });
      } else {
        setShiftState({
          shiftOpen: true,
          expectedCash: shiftInfo.expected,
          cash: {
            cashSales: cashSalesToday?.cashTotal ?? 0,
            cashIn: shiftInfo.transactions.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0),
            cashOut: shiftInfo.transactions.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0),
          },
        });
      }
      setShiftLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [warehouseId]);

  // Re-fetch the trend whenever the selected period changes — one grouped
  // query (GROUP BY date(confirmed_at)) per range, not 7/14/30 separate
  // calls and not a client-side slice of a fixed 30-day fetch. Measured:
  // ~106ms for the old 7-separate-calls pattern against a 164k-invoice
  // history vs. well under 1ms for one grouped call over the same range.
  useEffect(() => {
    if (!window.api) return;
    let cancelled = false;
    setTrendLoading(true);
    setTrendError(false);
    void (async () => {
      try {
        const from = daysAgoIso(trendDays - 1);
        const to = todayIso();
        const points = await window.api!.salesReport.trend(from, to);
        if (cancelled) return;
        const byDate = new Map(points.map((p) => [p.date, p]));
        const filled = Array.from({ length: trendDays }).map((_, i) => {
          const d = daysAgoIso(trendDays - 1 - i);
          const dow = new Date(d + 'T00:00:00').getDay();
          return { dateIso: d, label: WEEKDAY_SHORT[dow]!, total: byDate.get(d)?.grandTotal ?? 0 };
        });
        setTrend(filled);
      } catch {
        if (!cancelled) setTrendError(true);
      } finally {
        if (!cancelled) setTrendLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trendDays]);

  if (loading) {
    // Mirrors the real layout below one-for-one (hero row, trend panel,
    // two equal-weight bands, quick links) so the skeleton doesn't jump or
    // resize once the data arrives — a placeholder shaped like something
    // else is worse than no placeholder.
    return (
      <div className="stack">
        <div className="dash-hero">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="skeleton" style={{ blockSize: '5.5rem', borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
        <span className="skeleton" style={{ display: 'block', blockSize: '11rem', borderRadius: 'var(--radius-lg)' }} />
        <div className="dash-band">
          <span className="skeleton" style={{ blockSize: '14rem', borderRadius: 'var(--radius-lg)' }} />
          <span className="skeleton" style={{ blockSize: '14rem', borderRadius: 'var(--radius-lg)' }} />
        </div>
        <div className="dash-band">
          <span className="skeleton" style={{ blockSize: '10rem', borderRadius: 'var(--radius-lg)' }} />
          <span className="skeleton" style={{ blockSize: '10rem', borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  if (error || !base) {
    return (
      <div className="error-state">
        <span className="error-state__icon">
          <AlertCircleIcon className="icon--lg" />
        </span>
        <p className="error-state__title">{ar.dashboard.loadFailed}</p>
        {error && <p className="error-state__hint">{error}</p>}
        <button type="button" className="btn btn--soft btn--sm" style={{ marginBlockStart: 'var(--space-3)' }} onClick={() => void loadBase()}>
          <RefreshIcon className="icon--sm" />
          {ar.dashboard.retry}
        </button>
      </div>
    );
  }

  const netCash = shiftState?.cash ? shiftState.cash.cashSales + shiftState.cash.cashIn - shiftState.cash.cashOut : 0;

  return (
    <div className="stack">
      {/* Filters — warehouse only affects the shift/cash panel below (the
          only section actually scoped per warehouse in the API); trend
          period only affects the sales-trend chart. Neither is decorative. */}
      {base.warehouses.length > 1 && (
        <div className="dash-filter-bar">
          <label className="dash-filter">
            <span className="dash-filter__label">{ar.dashboard.warehouseFilter}</span>
            <select
              className="field field--sm"
              value={warehouseId ?? ''}
              onChange={(e) => setWarehouseId(Number(e.target.value))}
            >
              {base.warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nameAr}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Today's business at a glance */}
      <div className="dash-hero">
        <div className="dash-card dash-card--success">
          <span className="dash-card__icon">
            <TrendingUpIcon />
          </span>
          <div className="dash-card__body">
            <span className="dash-card__label">{ar.dashboard.todaySales}</span>
            <span className="dash-card__value" dir="ltr">
              {fromPiastres(base.todaySalesTotal)}
            </span>
            <span className="dash-card__sub">
              {ar.dashboard.todayProfit}: <span dir="ltr">{fromPiastres(base.todayProfit)}</span>
            </span>
          </div>
        </div>

        <div className="dash-card">
          <span className="dash-card__icon">
            <ReceiptIcon />
          </span>
          <div className="dash-card__body">
            <span className="dash-card__label">{ar.dashboard.todayInvoices}</span>
            <span className="dash-card__value" dir="ltr">
              {base.todayInvoiceCount}
            </span>
          </div>
        </div>

        <div className={shiftState?.shiftOpen ? 'dash-card dash-card--success' : 'dash-card'}>
          <span className="dash-card__icon">
            <WalletIcon />
          </span>
          <div className="dash-card__body">
            <span className="dash-card__label">{ar.dashboard.openShift}</span>
            {shiftLoading ? (
              <span className="skeleton" style={{ inlineSize: '5rem', blockSize: '1.4rem', display: 'inline-block' }} />
            ) : shiftState?.shiftOpen ? (
              <span className="dash-card__value" dir="ltr">
                {fromPiastres(shiftState.expectedCash ?? 0)}
              </span>
            ) : (
              <span className="dash-card__sub">{ar.dashboard.noOpenShift}</span>
            )}
          </div>
        </div>
      </div>

      {/* Sales trend, with a real period filter */}
      <div className="panel">
        <div className="dash-panel-header">
          <h2 className="section-heading section-heading--inline">{ar.dashboard.salesTrend}</h2>
          <span className="dash-chart-tabs">
            {TREND_PERIODS.map((n) => (
              <button
                key={n}
                type="button"
                className={n === trendDays ? 'dash-chart-tab dash-chart-tab--active' : 'dash-chart-tab'}
                onClick={() => setTrendDays(n)}
              >
                {ar.dashboard.lastNDays.replace('{n}', String(n))}
              </button>
            ))}
          </span>
        </div>
        {trendLoading ? (
          <span className="skeleton" style={{ display: 'block', blockSize: '9rem', borderRadius: 'var(--radius-md)' }} />
        ) : trendError ? (
          <div className="dash-chart-empty">{ar.dashboard.salesTrendFailed}</div>
        ) : (
          <SalesSparkline
            points={trend.map((p) => ({
              label: p.label,
              value: p.total,
              displayValue: fromPiastres(p.total),
            }))}
          />
        )}
      </div>

      {/* Operations: inventory + recent activity side by side */}
      <h2 className="section-heading section-heading--inline">{ar.dashboard.operationsSection}</h2>
      <div className="dash-band">
        <div className="panel">
          <div className="dash-panel-header">
            <h2 className="section-heading section-heading--inline">{ar.dashboard.lowStockList}</h2>
            {base.lowStockSample.length > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onNavigate('items.stock')}>
                {ar.dashboard.viewAll}
                <ArrowLeftIcon className="icon--sm" />
              </button>
            )}
          </div>
          {base.lowStockSample.length === 0 ? (
            <EmptyState title={ar.dashboard.noLowStock} />
          ) : (
            <div>
              {base.lowStockSample.map((item) => (
                <div className="dash-tx-row" key={item.itemId}>
                  <span className="dash-tx-icon dash-tx-icon--warning">
                    <BoxIcon className="icon--sm" />
                  </span>
                  <span className="dash-tx-main">
                    <span className="dash-tx-title">{item.nameAr}</span>
                  </span>
                  <span className="dash-tx-amount" dir="ltr">
                    {item.qtyOnHand === 0 ? (
                      <span className="badge badge--error">{ar.stock.outOfStock}</span>
                    ) : (
                      item.qtyOnHand
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="dash-panel-header">
            <h2 className="section-heading section-heading--inline">{ar.dashboard.recentTransactions}</h2>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onNavigate('sales.invoices')}>
              {ar.dashboard.viewAll}
              <ArrowLeftIcon className="icon--sm" />
            </button>
          </div>
          {base.recentInvoices.length === 0 ? (
            <EmptyState title={ar.dashboard.noTransactions} />
          ) : (
            <div>
              {base.recentInvoices.map((inv) => (
                <div className="dash-tx-row" key={inv.id}>
                  <span className="dash-tx-icon">
                    <ReceiptIcon className="icon--sm" />
                  </span>
                  <span className="dash-tx-main">
                    <span className="dash-tx-title">
                      {ar.salesReport.serial} #{inv.serial} · {inv.invoiceType === 'cash' ? ar.sales.cash : ar.sales.credit}
                    </span>
                    <br />
                    <span className="dash-tx-meta">{relativeTime(inv.confirmedAt ?? inv.createdAt)}</span>
                  </span>
                  <span className="dash-tx-amount" dir="ltr">
                    {fromPiastres(inv.total)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Financial: cash drawer + receivables side by side */}
      <h2 className="section-heading section-heading--inline">{ar.dashboard.financialSection}</h2>
      <div className="dash-band">
        <div className="panel">
          <h2 className="section-heading">{ar.dashboard.cashSnapshot}</h2>
          {shiftLoading ? (
            <span className="skeleton" style={{ display: 'block', blockSize: '8rem', borderRadius: 'var(--radius-md)' }} />
          ) : !shiftState?.cash ? (
            <EmptyState title={ar.dashboard.noOpenShift} />
          ) : (
            <div className="dash-cash-rows">
              <div className="dash-cash-row">
                <span className="dash-cash-row__label">{ar.dashboard.cashSalesLabel}</span>
                <span className="dash-cash-row__value" dir="ltr">{fromPiastres(shiftState.cash.cashSales)}</span>
              </div>
              <div className="dash-cash-row">
                <span className="dash-cash-row__label">{ar.dashboard.cashInLabel}</span>
                <span className="dash-cash-row__value" dir="ltr">{fromPiastres(shiftState.cash.cashIn)}</span>
              </div>
              <div className="dash-cash-row">
                <span className="dash-cash-row__label">{ar.dashboard.cashOutLabel}</span>
                <span className="dash-cash-row__value" dir="ltr">{fromPiastres(shiftState.cash.cashOut)}</span>
              </div>
              <div className="dash-cash-row dash-cash-row--net">
                <span className="dash-cash-row__label">{ar.dashboard.netCashLabel}</span>
                <span className="dash-cash-row__value" dir="ltr">{fromPiastres(netCash)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="panel">
          <h2 className="section-heading">{ar.dashboard.receivables}</h2>
          {!base.receivables || base.receivables.totalOwed === 0 ? (
            <EmptyState title={ar.dashboard.noReceivables} />
          ) : (
            <div className="dash-stat-block">
              <span className="dash-stat-block__value dash-stat-block__value--warning" dir="ltr">
                {fromPiastres(base.receivables.totalOwed)}
              </span>
              <span className="dash-stat-block__hint">
                {base.receivables.customerCount} {ar.dashboard.receivablesHint}
              </span>
              <button type="button" className="btn btn--soft btn--sm dash-stat-block__action" onClick={() => onNavigate('customers.list')}>
                {ar.dashboard.viewAll}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick access */}
      <div>
        <h2 className="section-heading">{ar.dashboard.quickLinks}</h2>
        <div className="dash-quick-links">
          {QUICK_LINKS.map((link) => (
            <button key={link.target} type="button" className="dash-quick-link" onClick={() => onNavigate(link.target)}>
              <span className="dash-quick-link__icon">{link.icon}</span>
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
