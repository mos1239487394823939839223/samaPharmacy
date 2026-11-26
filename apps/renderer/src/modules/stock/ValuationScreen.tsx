/**
 * قيمة المخزون — what the stock on the shelf is worth: at what it cost
 * (landed cost of each batch), at today's selling price, and the profit
 * expected when it sells. Per item below, sortable, searchable, exportable.
 * Expired and quarantined stock is shown apart: it will not sell.
 */

import { useEffect, useMemo, useState } from 'react';
import type { Valuation, WarehouseRow } from '@pharmacy/shared';
import { fromPiastres, fromPiastresGrouped, todayLocal } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { SearchInput } from '../../components/SearchInput';
import { EmptyState, TableSkeleton } from '../../components/EmptyState';
import { useToast } from '../../components/Toast';
import { errorText } from '../../lib/errors';
import { exportCsv } from '../../lib/csv';
import { useRefreshOnActivate, useWorkspace } from '../../lib/workspace';

type Sort = 'cost' | 'sale' | 'profit' | 'margin' | 'name';
const PAGE_SIZE = 50;
const t = ar.valuation;

const money = (p: number) => `${fromPiastresGrouped(p)} ${ar.common.currency}`;
const pct = (profit: number, sale: number) => (sale > 0 ? Math.round((profit * 1000) / sale) / 10 : 0);

export function ValuationScreen() {
  const { openItem } = useWorkspace();
  const { showToast } = useToast();
  const [data, setData] = useState<Valuation | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<Sort>('cost');
  const [page, setPage] = useState(0);

  async function load() {
    setError(null);
    try {
      setData(await window.api!.valuation.get(warehouseId));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void window.api!.warehouses.list().then(setWarehouses);
  }, []);
  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);
  // Sales and purchases in other tabs change the figures.
  useRefreshOnActivate(() => void load());

  const rows = useMemo(() => {
    if (!data) return [];
    const f = filter.trim().toLowerCase();
    const list = f ? data.rows.filter((r) => r.nameAr.toLowerCase().includes(f) || String(r.code).includes(f)) : [...data.rows];
    const val = (n: number | null) => n ?? -Infinity;
    if (sort === 'sale') list.sort((a, b) => val(b.saleValue) - val(a.saleValue));
    else if (sort === 'profit') list.sort((a, b) => val(b.profit) - val(a.profit));
    else if (sort === 'margin') list.sort((a, b) => (b.saleValue ? pct(b.profit ?? 0, b.saleValue) : -1) - (a.saleValue ? pct(a.profit ?? 0, a.saleValue) : -1));
    else if (sort === 'name') list.sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar'));
    return list;
  }, [data, filter, sort]);
  useEffect(() => setPage(0), [filter, sort, warehouseId]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  async function exportList() {
    const msg = await exportCsv(
      `stock-value-${todayLocal()}.csv`,
      [t.cols.item, t.cols.code, t.cols.qty, t.cols.qtyBase, t.cols.cost, t.cols.sale, t.cols.profit, t.cols.margin],
      rows.map((r) => [
        r.nameAr, r.code, r.qtyText, r.qtyBase, fromPiastres(r.costValue),
        r.saleValue == null ? '' : fromPiastres(r.saleValue),
        r.profit == null ? '' : fromPiastres(r.profit),
        r.saleValue ? pct(r.profit ?? 0, r.saleValue) : '',
      ])
    );
    if (msg) showToast(msg, 'info');
  }

  if (loading && !data) return <TableSkeleton cols={6} />;
  if (error && !data) return <div className="alert alert--error">{error}</div>;
  if (!data) return null;
  const tot = data.totals;

  return (
    <div className="stack valuation">

      {warehouses.length > 1 && (
        <label className="formfield formfield--narrow">
          <span className="formfield__label">{t.warehouse}</span>
          <select className="field" value={warehouseId ?? ''} onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">{t.allWarehouses}</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nameAr}
              </option>
            ))}
          </select>
        </label>
      )}

      {error && <div className="alert alert--error">{error}</div>}

      <div className="valuation__cards">
        <div className="vcard">
          <span className="vcard__label">{t.cost}</span>
          <span className="vcard__value" dir="ltr">{money(tot.costValue)}</span>
          <span className="vcard__hint">{t.costHint}</span>
        </div>
        <div className="vcard">
          <span className="vcard__label">{t.sale}</span>
          <span className="vcard__value" dir="ltr">{money(tot.saleValue)}</span>
          <span className="vcard__hint">{t.saleHint}</span>
        </div>
        <div className={tot.profit >= 0 ? 'vcard vcard--good' : 'vcard vcard--bad'}>
          <span className="vcard__label">{t.profit}</span>
          <span className="vcard__value" dir="ltr">{money(tot.profit)}</span>
          <span className="vcard__hint">{t.margin.replace('{pct}', String(tot.marginPct))}</span>
        </div>
        <div className="vcard">
          <span className="vcard__label">{t.items}</span>
          <span className="vcard__value" dir="ltr">{tot.items.toLocaleString('en-US')}</span>
          <span className="vcard__hint">{t.itemsHint}</span>
        </div>
      </div>

      {(tot.unpricedItems > 0 || tot.expiredCost > 0 || tot.quarantinedCost > 0) && (
        <div className="valuation__notes">
          {tot.unpricedItems > 0 && (
            <span className="badge badge--warning">{t.unpriced.replace('{n}', String(tot.unpricedItems)).replace('{cost}', money(tot.unpricedCost))}</span>
          )}
          {tot.expiredCost > 0 && (
            <span className="badge badge--error">{t.expired.replace('{n}', String(tot.expiredItems)).replace('{cost}', money(tot.expiredCost))}</span>
          )}
          {tot.quarantinedCost > 0 && <span className="badge badge--muted">{t.quarantined.replace('{cost}', money(tot.quarantinedCost))}</span>}
        </div>
      )}

      <div className="shortages__bar">
        <SearchInput className="field" placeholder={t.filter} value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select className="field field--sm shortages__sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t.sortLabel}>
          {(['cost', 'sale', 'profit', 'margin', 'name'] as const).map((s) => (
            <option key={s} value={s}>
              {t.sort[s]}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn--sm" disabled={rows.length === 0} onClick={() => void exportList()}>
          {ar.exportCsv.button}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={filter.trim() ? t.noMatch : t.empty} hint={filter.trim() ? undefined : t.emptyHint} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="datatable">
              <thead>
                <tr>
                  <th>{t.cols.item}</th>
                  <th>{t.cols.qty}</th>
                  <th>{t.cols.cost}</th>
                  <th>{t.cols.sale}</th>
                  <th>{t.cols.profit}</th>
                  <th>{t.cols.margin}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.itemId}>
                    <td>
                      <button type="button" className="link-button" onClick={() => openItem(r.itemId)}>
                        {r.nameAr}
                      </button>
                      <div className="muted small" dir="ltr">
                        #{r.code}
                      </div>
                    </td>
                    <td>{r.qtyText}</td>
                    <td dir="ltr">{fromPiastresGrouped(r.costValue)}</td>
                    <td dir="ltr">{r.saleValue == null ? <span className="badge badge--warning">{t.noPrice}</span> : fromPiastresGrouped(r.saleValue)}</td>
                    <td dir="ltr" className={r.profit != null && r.profit < 0 ? 'text-bad strong' : 'strong'}>
                      {r.profit == null ? '—' : fromPiastresGrouped(r.profit)}
                    </td>
                    <td dir="ltr" className={r.profit != null && r.profit < 0 ? 'text-bad' : 'muted'}>
                      {r.saleValue ? `${pct(r.profit ?? 0, r.saleValue)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="btn-row pager">
              <button type="button" className="btn btn--sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                {ar.shortages.prev}
              </button>
              <span className="muted small">{ar.shortages.pageOf.replace('{page}', String(page + 1)).replace('{pages}', String(pages))}</span>
              <button type="button" className="btn btn--sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                {ar.shortages.next}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
