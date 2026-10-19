import { useEffect, useRef, useState } from 'react';
import type { CustomerRow, ItemListRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../i18n/ar';
import { MenuIcon, SearchIcon, BoxIcon, UsersIcon, PillIcon } from './icons';
import { savePharmacyName, usePharmacyName } from '../lib/pharmacyName';
import type { ScreenId } from '../lib/navigation';
import { SearchInput } from './SearchInput';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onToggleDrawer: () => void;
  /** Navigates to a list screen and seeds its own search box with the same
      query — the global search has no record-detail route of its own, so
      "jump to result" means "open the screen that already knows how to
      display and edit this record, pre-filtered to it." */
  onSearchNavigate: (screen: ScreenId, query: string) => void;
}

const RESULT_LIMIT = 5;

/**
 * Header quick search — items + customers, per this app's most common
 * lookups. Both endpoints are Arabic-normalized already (blueprint §2.6),
 * so this reuses them rather than building a third search path. Two API
 * calls per keystroke (debounced) is an acceptable cost at this result
 * count; a heavier global index is unwarranted for two lookups.
 */
export function Toolbar({ onToggleDrawer, onSearchNavigate }: Props) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ItemListRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Flat list in visual order (items group first, then customers) — the one
  // arrow-key/Enter selection model needs a single index across both groups.
  const flatResults: Array<{ kind: 'item'; row: ItemListRow } | { kind: 'customer'; row: CustomerRow }> = [
    ...items.map((row) => ({ kind: 'item' as const, row })),
    ...customers.map((row) => ({ kind: 'customer' as const, row })),
  ];

  useEffect(() => {
    if (!window.api || !query.trim()) {
      setItems([]);
      setCustomers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void Promise.all([
        window.api!.items.search(query, RESULT_LIMIT),
        window.api!.customers.search(query, RESULT_LIMIT),
      ])
        .then(([itemResults, customerResults]) => {
          setItems(itemResults);
          setCustomers(customerResults);
        })
        .finally(() => setLoading(false));
    }, 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  useEffect(() => setActiveIndex(-1), [query]);

  // Click outside closes the dropdown without clearing the typed query —
  // matches the autocomplete pattern used on the POS/purchase-return screens.
  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  function goToItem(row: ItemListRow) {
    setOpen(false);
    onSearchNavigate('items.list', row.nameAr);
  }

  function goToCustomer(row: CustomerRow) {
    setOpen(false);
    onSearchNavigate('customers.list', row.name);
  }

  function selectFlat(index: number) {
    const entry = flatResults[index];
    if (!entry) return;
    if (entry.kind === 'item') goToItem(entry.row);
    else goToCustomer(entry.row);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.code === 'Escape') {
      setOpen(false);
      return;
    }
    if (!open || flatResults.length === 0) return;
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatResults.length);
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flatResults.length - 1 : i - 1));
    } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      selectFlat(activeIndex === -1 ? 0 : activeIndex);
    }
  }

  const hasQuery = query.trim().length > 0;
  const hasResults = items.length > 0 || customers.length > 0;
  let flatCursor = -1;

  return (
    <header className="header">
      <button
        type="button"
        className="header__toggle"
        onClick={onToggleDrawer}
        title={ar.shell.toggleDrawer}
        aria-label={ar.shell.toggleDrawer}
      >
        <MenuIcon />
      </button>

      <PharmacyBadge />

      <div className="header__search" ref={wrapRef}>
        <span className="header__search-icon">
          <SearchIcon className="icon--sm" />
        </span>
        <SearchInput
          className="field"
          placeholder={ar.shell.search}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => hasQuery && setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
        />

        {open && hasQuery && (
          <div className="header-search-panel">
            {loading ? (
              <div className="header-search-panel__status">
                <span className="skeleton" style={{ display: 'block', blockSize: '1rem', borderRadius: 'var(--radius-xs)' }} />
              </div>
            ) : !hasResults ? (
              <div className="header-search-panel__status">{ar.shell.searchNoResults}</div>
            ) : (
              <>
                {items.length > 0 && (
                  <div className="header-search-panel__group">
                    <div className="header-search-panel__group-label">
                      <BoxIcon className="icon--sm" />
                      {ar.shell.searchItemsGroup}
                    </div>
                    <ul>
                      {items.map((row) => {
                        flatCursor += 1;
                        const isActive = flatCursor === activeIndex;
                        return (
                          <li key={row.id}>
                            <button
                              type="button"
                              className={isActive ? 'header-search-result header-search-result--active' : 'header-search-result'}
                              onMouseEnter={() => setActiveIndex(flatCursor)}
                              onClick={() => goToItem(row)}
                            >
                              <span className="header-search-result__title">{row.nameAr}</span>
                              {row.publicPrice !== null && (
                                <span className="header-search-result__meta" dir="ltr">
                                  {fromPiastres(row.publicPrice)}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {customers.length > 0 && (
                  <div className="header-search-panel__group">
                    <div className="header-search-panel__group-label">
                      <UsersIcon className="icon--sm" />
                      {ar.shell.searchCustomersGroup}
                    </div>
                    <ul>
                      {customers.map((row) => {
                        flatCursor += 1;
                        const isActive = flatCursor === activeIndex;
                        return (
                          <li key={row.id}>
                            <button
                              type="button"
                              className={isActive ? 'header-search-result header-search-result--active' : 'header-search-result'}
                              onMouseEnter={() => setActiveIndex(flatCursor)}
                              onClick={() => goToCustomer(row)}
                            >
                              <span className="header-search-result__title">{row.name}</span>
                              <span className="header-search-result__meta" dir="ltr">
                                {row.mobile1}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="header__spacer" />
    </header>
  );
}

/**
 * The pharmacy's name, from Settings. Click it (or Enter on it) to rename in
 * place: Enter saves, Esc cancels. There are no user accounts (decision D18),
 * so the header shows the pharmacy rather than a person.
 */
function PharmacyBadge() {
  const name = usePharmacyName();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState(false);
  const label = name?.trim() || ar.shell.pharmacist;

  async function commit() {
    const next = draft.trim();
    if (!next) return setError(true);
    try {
      if (next !== name) await savePharmacyName(next);
      setEditing(false);
    } catch {
      setError(true);
    }
  }

  if (editing) {
    return (
      <div className="brand">
        <span className="brand__mark">
          <PillIcon className="icon--sm" />
        </span>
        <input
          className={error ? 'field brand__input field--invalid' : 'field brand__input'}
          autoFocus
          value={draft}
          maxLength={120}
          aria-label={ar.shell.pharmacyName}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.code === 'Enter' || e.code === 'NumpadEnter') void commit();
            if (e.code === 'Escape') setEditing(false);
          }}
          onBlur={() => void commit()}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className="brand brand--button"
      title={ar.shell.renamePharmacy}
      onClick={() => {
        setDraft(name ?? '');
        setError(false);
        setEditing(true);
      }}
    >
      <span className="brand__mark">
        <PillIcon className="icon--sm" />
      </span>
      <span className="brand__name">{label}</span>
      <span className="brand__edit" aria-hidden="true">✎</span>
    </button>
  );
}
