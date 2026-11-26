/**
 * الأصناف — list and form host.
 *
 * Search is debounced at 120ms per blueprint §2.6. This screen queries SQLite
 * because the list is paged; the POS will instead hold the item index in memory
 * and filter in JS, which is a different code path by design.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ItemDetail, ItemListRow } from '@pharmacy/shared';
import { fromPiastres, fromPiastresGrouped, todayLocal } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { ItemForm } from './ItemForm';
import { ImportWizard } from './ImportWizard';
import { EmptyState, TableSkeleton } from '../../components/EmptyState';
import { errorText } from '../../lib/errors';
import { SearchInput } from '../../components/SearchInput';
import { ShortageButton, useShortageItems } from '../../components/ShortageDialog';
import { QuickItemDialog } from '../../components/QuickItemDialog';
import { emitItemUpdated } from '../../lib/itemEvents';
import { useToast } from '../../components/Toast';
import { exportCsv } from '../../lib/csv';

type Mode = { view: 'list' } | { view: 'create' } | { view: 'edit'; item: ItemDetail } | { view: 'import' };

export function ItemsScreen({ showBadges, initialQuery }: { showBadges: boolean; initialQuery?: string }) {
  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const [exporting, setExporting] = useState(false);
  const shortageItems = useShortageItems();
  const [quick, setQuick] = useState(false);
  const { showToast } = useToast();

  /** All items to CSV, in the import layout — edit in Excel and re-import, or move to another machine. */
  async function exportItems() {
    setExporting(true);
    try {
      const sheet = await window.api!.items.exportSheet();
      const msg = await exportCsv(`items-${todayLocal()}.csv`, sheet.headers, sheet.rows);
      if (msg) showToast(msg, 'info');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setExporting(false);
    }
  }
  const [rows, setRows] = useState<ItemListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState(initialQuery ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async (q: string) => {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([
        q.trim() ? window.api.items.search(q, 200) : window.api.items.list({ limit: 200 }),
        window.api.items.count(),
      ]);
      setRows(list);
      setTotal(count);
    } catch (err) {
      setError(`${ar.items.errors.loadFailed}: ${errorText(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode.view === 'list') void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.view]);

  useEffect(() => {
    if (mode.view !== 'list') return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(query), 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (mode.view === 'list') searchRef.current?.focus();
  }, [mode.view]);

  async function openEdit(id: number) {
    if (!window.api) return;
    const item = await window.api.items.get(id);
    if (item) setMode({ view: 'edit', item });
  }

  async function deactivate(id: number) {
    if (!window.api) return;
    if (!confirm(ar.items.confirmDeactivate)) return;
    try {
      await window.api.items.deactivate(id);
      void load(query);
    } catch (err) {
      setError(`${ar.items.errors.deactivateFailed}: ${errorText(err)}`);
    }
  }

  if (mode.view === 'create' || mode.view === 'edit') {
    const editing = mode.view === 'edit' ? mode.item : null;
    return (
      <div className="stack">
        {editing && (
          <div className="btn-row" style={{ marginBlockStart: 0 }}>
            <ShortageButton itemId={editing.id} itemName={editing.nameAr} listed={shortageItems.has(editing.id)} />
          </div>
        )}
        <ItemForm
          existing={editing}
          showBadges={showBadges}
          onSaved={() => {
            // Open invoices showing this item refresh their line.
            if (editing) emitItemUpdated(editing.id);
            setMode({ view: 'list' });
          }}
          onCancel={() => setMode({ view: 'list' })}
        />
      </div>
    );
  }

  if (mode.view === 'import') {
    return (
      <ImportWizard
        onClose={() => setMode({ view: 'list' })}
        onImported={() => void load(query)}
      />
    );
  }

  return (
    <div className="items">
      <div className="items__bar">
        <SearchInput
          ref={searchRef}
          className="field items__search"
          placeholder={ar.items.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
                    <button
              type="button"
              className="btn btn--primary"
              onClick={() => setMode({ view: 'create' })}
            >
              {ar.items.add}
            </button>
            <button type="button" className="btn" onClick={() => setQuick(true)}>
              {ar.quickItem.open}
            </button>
            <button type="button" className="btn" onClick={() => setMode({ view: 'import' })}>
              {ar.items.import.open}
            </button>
            <button type="button" className="btn" disabled={exporting} onClick={() => void exportItems()}>
              {exporting ? ar.items.exportBusy : ar.items.export}
            </button>
        <span className="items__count">
          {ar.items.count}: <span dir="ltr">{total}</span>
        </span>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <TableSkeleton cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={query.trim() ? ar.items.noResults : ar.items.empty}
          hint={query.trim() ? ar.emptyHints.itemsNoMatch : ar.emptyHints.items}
          action={
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setQuick(true)}>
              {query.trim() ? ar.quickItem.openNamed.replace('{name}', query.trim()) : ar.quickItem.open}
            </button>
          }
        />
      ) : (
        <div className="table-wrap"><table className="datatable itemlist">
          <thead>
            <tr>
              <th>{ar.items.list.item}</th>
              <th className="num">{ar.items.list.price}</th>
              <th>{ar.items.list.stock}</th>
              <th>{ar.items.fields.shelfLocation}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onDoubleClick={() => void openEdit(r.id)} title={ar.items.list.dblClick}>
                <td>
                  <div className="itemlist__name">{r.nameAr}</div>
                  <div className="itemlist__meta">
                    {r.nameEn && <span dir="ltr">{r.nameEn}</span>}
                    <span dir="ltr" className="itemlist__code">#{r.code}</span>
                  </div>
                </td>
                <td dir="ltr" className="num strong">{r.publicPrice === null ? '—' : fromPiastresGrouped(r.publicPrice)}</td>
                <td>
                  <StockCell row={r} />
                </td>
                <td className="muted">{r.shelfLocation ?? '—'}</td>
                <td className="datatable__actions">
                  <button type="button" className="btn btn--sm" onClick={() => void openEdit(r.id)}>
                    {ar.items.edit}
                  </button>
                  <ShortageButton itemId={r.id} itemName={r.nameAr} listed={shortageItems.has(r.id)} />
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => void deactivate(r.id)}>
                    {ar.items.deactivate}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {quick && (
        <QuickItemDialog
          initialName={query}
          onClose={() => setQuick(false)}
          onCreated={(item) => {
            setQuick(false);
            showToast(ar.quickItem.created.replace('{name}', item.nameAr));
            setQuery(item.nameAr);
            void load(item.nameAr);
          }}
        />
      )}
    </div>
  );
}

/** Stock as the pharmacist counts it: «10 علبة + 5 قرص», or «نفد». */
function StockCell({ row }: { row: ItemListRow }) {
  const stock = row.stockBase ?? 0;
  if (stock <= 0) return <span className="stock-pill stock-pill--out">{ar.items.list.out}</span>;
  const factor = row.boxFactor && row.boxFactor > 1 ? row.boxFactor : 1;
  const boxes = Math.floor(stock / factor);
  const rest = stock % factor;
  const parts: string[] = [];
  if (boxes > 0) parts.push(`${boxes.toLocaleString('en-US')} ${row.boxName ?? ''}`.trim());
  if (rest > 0) parts.push(`${rest} ${row.baseName ?? ''}`.trim());
  return <span className="stock-pill">{parts.join(' + ')}</span>;
}
