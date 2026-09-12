/**
 * الأصناف — list and form host.
 *
 * Search is debounced at 120ms per blueprint §2.6. This screen queries SQLite
 * because the list is paged; the POS will instead hold the item index in memory
 * and filter in JS, which is a different code path by design.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ItemDetail, ItemListRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { ItemForm } from './ItemForm';

type Mode = { view: 'list' } | { view: 'create' } | { view: 'edit'; item: ItemDetail };

export function ItemsScreen({ showBadges }: { showBadges: boolean }) {
  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const [rows, setRows] = useState<ItemListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
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
      setError((err as Error).message);
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
    await window.api.items.deactivate(id);
    void load(query);
  }

  if (mode.view === 'create' || mode.view === 'edit') {
    return (
      <ItemForm
        existing={mode.view === 'edit' ? mode.item : null}
        showBadges={showBadges}
        onSaved={() => setMode({ view: 'list' })}
        onCancel={() => setMode({ view: 'list' })}
      />
    );
  }

  return (
    <div className="items">
      <div className="items__bar">
        <input
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
        <span className="items__count">
          {ar.items.count}: <span dir="ltr">{total}</span>
        </span>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <p className="muted">{ar.items.loading}</p>
      ) : rows.length === 0 ? (
        <p className="muted">{query.trim() ? ar.items.noResults : ar.items.empty}</p>
      ) : (
        <table className="datatable">
          <thead>
            <tr>
              <th>{ar.items.fields.code}</th>
              <th>{ar.items.fields.nameAr}</th>
              <th>{ar.items.fields.nameEn}</th>
              <th>{ar.items.fields.publicPrice}</th>
              <th>{ar.items.fields.shelfLocation}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onDoubleClick={() => void openEdit(r.id)}>
                <td dir="ltr">{r.code}</td>
                <td>{r.nameAr}</td>
                <td dir="ltr">{r.nameEn ?? '—'}</td>
                <td dir="ltr">{r.publicPrice === null ? '—' : fromPiastres(r.publicPrice)}</td>
                <td>{r.shelfLocation ?? '—'}</td>
                <td className="datatable__actions">
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => void openEdit(r.id)}
                  >
                    {ar.items.edit}
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => void deactivate(r.id)}
                  >
                    {ar.items.deactivate}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
