/**
 * النواقص — the items that must be ordered, in one place.
 *
 * Add an existing item (search by name, barcode or item code, or just scan
 * the box), say how much is needed, then move it along: ناقص → تم الطلب →
 * متوفر. Removing an item closes its row instead of deleting it, so the
 * history of what was missing stays. The item itself is opened from here
 * for viewing or editing, and the list can be exported to send to a supplier.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ItemListRow, ShortageRow, ShortageStatus } from '@pharmacy/shared';
import { todayLocal } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { SearchInput } from '../../components/SearchInput';
import { EmptyState, TableSkeleton } from '../../components/EmptyState';
import { ShortageDialog } from '../../components/ShortageDialog';
import { useToast } from '../../components/Toast';
import { errorText } from '../../lib/errors';
import { exportCsv } from '../../lib/csv';
import { useRefreshOnActivate, useWorkspace } from '../../lib/workspace';
import { emitShortagesChanged, useItemUpdated, useShortagesChanged } from '../../lib/itemEvents';
import { useBarcodeScanner } from '../../hardware/scanner';
import { loadScannerConfig } from '../../hardware/config';

type Scope = 'active' | 'open' | 'ordered' | 'closed';
type Sort = 'newest' | 'name' | 'stock';
const PAGE_SIZE = 50;
const t = ar.shortages;

export function ShortagesScreen() {
  const { openItem } = useWorkspace();
  const { showToast } = useToast();
  const [rows, setRows] = useState<ShortageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<Scope>('active');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [page, setPage] = useState(0);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemListRow[]>([]);
  const [adding, setAdding] = useState<{ id: number; nameAr: string } | null>(null);
  const [editing, setEditing] = useState<ShortageRow | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  async function load() {
    setError(null);
    try {
      setRows(await window.api!.shortages.list(scope === 'closed' ? 'closed' : 'active'));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    setPage(0);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);
  useRefreshOnActivate(() => void load());
  useShortagesChanged(() => void load());
  useItemUpdated(() => void load());

  // Search the whole catalogue for an item to add.
  useEffect(() => {
    if (!query.trim()) return setResults([]);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void window.api!.items.search(query, 10).then(setResults), 120);
  }, [query]);

  // Scanning a box on this page offers to add it.
  useBarcodeScanner(
    async (event) => {
      const item = await window.api!.items.findByBarcode(event.code);
      if (item) setAdding({ id: item.id, nameAr: item.nameAr });
      else setError(ar.sales.errors.barcodeNotFound.replace('{code}', event.code));
    },
    { config: loadScannerConfig() }
  );

  async function setStatus(row: ShortageRow, status: ShortageStatus) {
    if (status === 'cancelled' && !window.confirm(t.confirmRemove.replace('{item}', row.itemNameAr))) return;
    setError(null);
    try {
      await window.api!.shortages.setStatus(row.id, status);
      emitShortagesChanged();
      showToast(t.statusDone[status].replace('{item}', row.itemNameAr));
    } catch (err) {
      setError(errorText(err));
    }
  }

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    let list = rows.filter((r) => (scope === 'open' ? r.status === 'open' : scope === 'ordered' ? r.status === 'ordered' : true));
    if (f) {
      list = list.filter(
        (r) =>
          r.itemNameAr.toLowerCase().includes(f) ||
          (r.itemNameEn ?? '').toLowerCase().includes(f) ||
          (r.barcode ?? '').includes(f) ||
          String(r.itemCode).includes(f) ||
          (r.note ?? '').toLowerCase().includes(f)
      );
    }
    const sorted = [...list];
    if (sort === 'name') sorted.sort((a, b) => a.itemNameAr.localeCompare(b.itemNameAr, 'ar'));
    else if (sort === 'stock') sorted.sort((a, b) => a.stockBase - b.stockBase);
    return sorted;
  }, [rows, scope, filter, sort]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const shown = visible.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  useEffect(() => setPage(0), [filter, sort]);

  const counts = useMemo(
    () => ({ open: rows.filter((r) => r.status === 'open').length, ordered: rows.filter((r) => r.status === 'ordered').length }),
    [rows]
  );

  async function exportList() {
    const msg = await exportCsv(
      `shortages-${todayLocal()}.csv`,
      [t.cols.item, ar.items.fields.nameEn, t.cols.barcode, t.cols.code, t.cols.stock, t.requiredQty, t.unit, t.cols.status, t.note],
      visible.map((r) => [r.itemNameAr, r.itemNameEn ?? '', r.barcode ?? '', r.itemCode, r.stockText, r.requiredQty ?? '', r.unitNameAr ?? '', t.status[r.status], r.note ?? ''])
    );
    if (msg) showToast(msg, 'info');
  }

  return (
    <div className="stack shortages">

      {/* Add: search the catalogue (or scan). */}
      <div className="panel shortages__add">
        <label className="formfield field-wrap">
          <span className="formfield__label">{t.addLabel}</span>
          <SearchInput className="field" placeholder={t.addPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} />
          {results.length > 0 && (
            <ul className="autocomplete">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setAdding({ id: r.id, nameAr: r.nameAr });
                      setQuery('');
                      setResults([]);
                    }}
                  >
                    <span>{r.nameAr}</span> <span className="muted small" dir="ltr">#{r.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>
      </div>

      {/* Filters */}
      <div className="shortages__bar">
        <div className="segmented" role="tablist">
          {(
            [
              ['active', `${t.scopes.active} (${counts.open + counts.ordered})`],
              ['open', `${t.scopes.open} (${counts.open})`],
              ['ordered', `${t.scopes.ordered} (${counts.ordered})`],
              ['closed', t.scopes.closed],
            ] as const
          ).map(([s, label]) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={scope === s}
              className={scope === s ? 'segmented__btn segmented__btn--active' : 'segmented__btn'}
              onClick={() => setScope(s)}
            >
              {scope === 'closed' && s !== 'closed' ? t.scopes[s] : label}
            </button>
          ))}
        </div>
        <SearchInput className="field" placeholder={t.filterPlaceholder} value={filter} onChange={(e) => setFilter(e.target.value)} />
        <select className="field field--sm shortages__sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label={t.sortLabel}>
          <option value="newest">{t.sort.newest}</option>
          <option value="name">{t.sort.name}</option>
          <option value="stock">{t.sort.stock}</option>
        </select>
        <button type="button" className="btn btn--sm" disabled={visible.length === 0} onClick={() => void exportList()}>
          {ar.exportCsv.button}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <TableSkeleton cols={7} />
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter.trim() ? t.noMatch : scope === 'closed' ? t.emptyClosed : t.empty}
          hint={scope === 'closed' || filter.trim() ? undefined : t.emptyHint}
        />
      ) : (
        <>
          <div className="table-wrap">
            <table className="datatable">
              <thead>
                <tr>
                  <th>{t.cols.item}</th>
                  <th>{t.cols.barcode}</th>
                  <th>{t.cols.stock}</th>
                  <th>{t.cols.required}</th>
                  <th>{t.cols.status}</th>
                  <th>{t.cols.notes}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => {
                  const active = r.status === 'open' || r.status === 'ordered';
                  return (
                    <tr key={r.id}>
                      <td>
                        <button type="button" className="link-button strong" onClick={() => openItem(r.itemId)} title={t.actions.view}>
                          {r.itemNameAr}
                        </button>
                        <div className="muted small" dir="ltr">
                          #{r.itemCode}
                        </div>
                      </td>
                      <td dir="ltr">{r.barcode ?? '—'}</td>
                      <td>
                        <span className={r.stockBase > 0 ? 'strong' : 'muted'}>{r.stockText}</span>
                        {active && r.stockBase > 0 && <div className="badge badge--success">{t.availableNow}</div>}
                      </td>
                      <td>{r.requiredQty ? `${r.requiredQty} ${r.unitNameAr ?? ''}` : '—'}</td>
                      <td>
                        <span className={`badge badge--status-${r.status}`}>{t.status[r.status]}</span>
                        <div className="muted small" dir="ltr">
                          {(r.closedAt ?? r.updatedAt).slice(0, 16)}
                        </div>
                      </td>
                      <td className="small">{r.note ?? '—'}</td>
                      <td className="datatable__actions shortages__actions">
                        {active && (
                          <>
                            {r.status === 'open' ? (
                              <button type="button" className="btn btn--sm" onClick={() => void setStatus(r, 'ordered')}>
                                {t.actions.ordered}
                              </button>
                            ) : (
                              <button type="button" className="btn btn--sm" onClick={() => void setStatus(r, 'open')}>
                                {t.actions.reopen}
                              </button>
                            )}
                            <button type="button" className="btn btn--sm btn--soft" onClick={() => void setStatus(r, 'resolved')}>
                              {t.actions.available}
                            </button>
                            <button type="button" className="btn btn--sm" onClick={() => setEditing(r)}>
                              {t.actions.edit}
                            </button>
                          </>
                        )}
                        <button type="button" className="btn btn--sm" onClick={() => openItem(r.itemId)}>
                          {t.actions.view}
                        </button>
                        {active && (
                          <button type="button" className="btn btn--sm btn--danger" onClick={() => void setStatus(r, 'cancelled')}>
                            {t.actions.remove}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="btn-row pager">
              <button type="button" className="btn btn--sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                {t.prev}
              </button>
              <span className="muted small">{t.pageOf.replace('{page}', String(page + 1)).replace('{pages}', String(pages))}</span>
              <button type="button" className="btn btn--sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                {t.next}
              </button>
            </div>
          )}
        </>
      )}

      {adding && <ShortageDialog itemId={adding.id} itemName={adding.nameAr} onClose={() => setAdding(null)} />}
      {editing && (
        <ShortageDialog itemId={editing.itemId} itemName={editing.itemNameAr} existing={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
