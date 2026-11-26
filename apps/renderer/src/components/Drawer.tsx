import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { normalizeArabic } from '@pharmacy/core';
import { DRAWER_TREE, toneOf, type DrawerNode, type ScreenId } from '../lib/navigation';
import { attachShortcuts } from '../lib/shortcuts';
import { ar } from '../i18n/ar';
import { ChevronDownIcon, HomeIcon, PlusIcon, SearchIcon, SidebarIcon, XIcon } from './icons';

interface OpenPage {
  id: string;
  screen: ScreenId;
  label: string;
  /** Holds unsaved work (a cart with items). */
  dirty: boolean;
}

interface Props {
  open: boolean;
  /** Slide-over panel above the page (small screens) instead of a column. */
  overlay?: boolean;
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  /** The workspace's open pages, shown above the navigation tree. */
  pages: OpenPage[];
  activePageId: string;
  onSelectPage: (id: string) => void;
  onClosePage: (id: string) => void;
  onNewSale: () => void;
}

const t = ar.workspace;
const RAIL_KEY = 'ui.sidebarRail';
const COLLAPSED_KEY = 'ui.sidebarCollapsed';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* blocked storage — the setting just isn't remembered */
  }
}

const HOME: DrawerNode = { label: ar.drawer.home, screen: 'dashboard', icon: <HomeIcon className="icon--sm" /> };

/** A screen's own icon (the menu entry's), for the open-page tabs. */
function screenIcon(screen: ScreenId): ReactNode {
  if (screen === 'dashboard') return HOME.icon;
  for (const g of DRAWER_TREE) {
    const leaf = g.children?.find((c) => c.screen === screen);
    if (leaf) return leaf.icon ?? g.icon;
  }
  return HOME.icon;
}

/** Folded for search: Arabic letter variants and case don't matter. */
const fold = (s: string) => normalizeArabic(s).toLowerCase();

/**
 * The sidebar.
 *
 *  - Search (Ctrl+K): type part of a screen's name, ↑/↓ to pick, Enter to open.
 *  - Open pages: the workspace tabs, with unsaved-work dots; collapsible.
 *  - Menu: groups that fold away (remembered); the group holding the screen on
 *    display always opens, so the current place is never hidden.
 *  - Rail: collapse to icons only (button at the bottom) for more room; every
 *    icon keeps its name as a tooltip.
 */
export function Drawer({ open, overlay = false, activeScreen, onNavigate, pages, activePageId, onSelectPage, onClosePage, onNewSale }: Props) {
  const [rail, setRail] = useState<boolean>(() => readJson(RAIL_KEY, false));
  const [collapsed, setCollapsed] = useState<string[]>(() => readJson(COLLAPSED_KEY, []));
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const isRail = rail && !overlay;

  useEffect(() => writeJson(RAIL_KEY, rail), [rail]);
  useEffect(() => writeJson(COLLAPSED_KEY, collapsed), [collapsed]);

  // Ctrl+K: jump to the menu search from anywhere (opening the rail if needed).
  useEffect(
    () =>
      attachShortcuts([
        {
          id: 'menuSearch',
          code: 'KeyK',
          ctrl: true,
          run: () => {
            setRail(false);
            requestAnimationFrame(() => searchRef.current?.focus());
          },
        },
      ]),
    []
  );

  const q = fold(query.trim());
  const matches = useMemo(() => {
    if (!q) return [];
    const all: Array<DrawerNode & { group: string }> = [{ ...HOME, group: '' }];
    for (const g of DRAWER_TREE) for (const c of g.children ?? []) all.push({ ...c, group: g.label });
    return all.filter((n) => fold(n.label).includes(q) || fold(n.group).includes(q));
  }, [q]);
  useEffect(() => setCursor(0), [q]);
  // Keep the page on display visible in the open-pages list.
  useEffect(() => {
    document.querySelector('.sb-tab--active')?.scrollIntoView({ block: 'nearest' });
  }, [activePageId, pages.length]);

  if (!open) return null;

  function go(screen: ScreenId | undefined) {
    if (!screen) return;
    onNavigate(screen);
    setQuery('');
  }

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.code === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, matches.length - 1));
    } else if (e.code === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      go(matches[cursor]?.screen);
    } else if (e.code === 'Escape') {
      setQuery('');
      searchRef.current?.blur();
    }
  }

  const toggleGroup = (label: string) =>
    setCollapsed((c) => (c.includes(label) ? c.filter((x) => x !== label) : [...c, label]));
  const pagesCollapsed = collapsed.includes('__pages');

  return (
    <aside className={`sidebar sidebar2${overlay ? ' sidebar--overlay' : ''}${isRail ? ' sidebar2--rail' : ''}`}>
      {/* Search */}
      {!isRail && (
        <div className="sb-search">
          <SearchIcon className="icon--sm sb-search__icon" />
          <input
            ref={searchRef}
            className="sb-search__input"
            placeholder={t.searchMenu}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            aria-label={t.searchMenu}
          />
          {query ? (
            <button type="button" className="sb-search__clear" onClick={() => setQuery('')} aria-label={ar.common.clearSearch}>
              <XIcon className="icon--sm" />
            </button>
          ) : (
            <kbd className="sb-kbd">Ctrl K</kbd>
          )}
        </div>
      )}

      {q ? (
        <nav className="sb-scroll" aria-label={t.menu}>
          {matches.length === 0 ? (
            <p className="sb-empty">{t.noMenuMatch}</p>
          ) : (
            <ul className="sb-list" role="listbox">
              {matches.map((m, i) => (
                <li key={m.screen}>
                  <button
                    type="button"
                    data-tone={m.screen ? toneOf(m.screen) : undefined}
                    role="option"
                    aria-selected={i === cursor}
                    className={i === cursor ? 'sb-item sb-item--cursor' : 'sb-item'}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => go(m.screen)}
                  >
                    <span className="sb-item__icon">{m.icon}</span>
                    <span className="sb-item__label">{m.label}</span>
                    {m.group && <span className="sb-item__meta">{m.group}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      ) : (
        <>
          {/* Open pages */}
          <section className="sb-pages" aria-label={t.openPages}>
            <div className="sb-section">
              {!isRail && (
                <button type="button" className="sb-section__toggle" onClick={() => toggleGroup('__pages')} aria-expanded={!pagesCollapsed}>
                  <ChevronDownIcon className={pagesCollapsed ? 'icon--xs sb-chevron sb-chevron--closed' : 'icon--xs sb-chevron'} />
                  {t.openPages}
                  <span className="sb-count">{pages.length}</span>
                </button>
              )}
              <button
                type="button"
                className="sb-newsale"
                onClick={onNewSale}
                title={`${t.newSaleTitle} (Ctrl+Shift+N)`}
                aria-label={t.newSaleTitle}
              >
                <PlusIcon className="icon--sm" />
                {!isRail && <span>{t.newSaleShort}</span>}
              </button>
            </div>
            {/* The rail keeps room for the menu: tabs are a sidebar-only list. */}
            {!pagesCollapsed && !isRail ? (
              <ul className="sb-tabs" title={isRail ? undefined : t.hint}>
                {pages.map((p) => {
                  const active = p.id === activePageId;
                  return (
                    <li key={p.id} className={active ? 'sb-tab sb-tab--active' : 'sb-tab'} data-tone={toneOf(p.screen)}>
                      <button
                        type="button"
                        className="sb-tab__select"
                        onClick={() => onSelectPage(p.id)}
                        aria-current={active ? 'page' : undefined}
                        title={p.dirty ? `${p.label} — ${t.unsaved}` : p.label}
                      >
                        <span className="sb-item__icon">{screenIcon(p.screen)}</span>
                        {!isRail && <span className="sb-item__label">{p.label}</span>}
                        {p.dirty && <span className="sb-dot" aria-label={t.unsaved} />}
                      </button>
                      {!isRail && (
                        <button
                          type="button"
                          className="sb-tab__close"
                          onClick={() => onClosePage(p.id)}
                          title={t.close}
                          aria-label={`${t.close} — ${p.label}`}
                        >
                          <XIcon className="icon--xs" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>

          {/* Menu */}
          <nav className="sb-scroll" aria-label={t.menu}>
            <div data-tone="home">
              <MenuItem node={HOME} active={activeScreen === 'dashboard'} rail={isRail} onClick={() => go('dashboard')} />
            </div>
            {DRAWER_TREE.map((g) => {
              const holdsActive = g.children?.some((c) => c.screen === activeScreen) ?? false;
              const closed = collapsed.includes(g.label) && !holdsActive;
              return (
                <div key={g.label} className="sb-group" data-tone={g.tone}>
                  {isRail ? (
                    <div className="sb-rail-sep" aria-hidden="true" />
                  ) : (
                    <button type="button" className="sb-group__head" onClick={() => toggleGroup(g.label)} aria-expanded={!closed}>
                      <span className="sb-group__title">
                        <span className="sb-group__dot" aria-hidden="true" />
                        {g.label}
                      </span>
                      <ChevronDownIcon className={closed ? 'icon--xs sb-chevron sb-chevron--closed' : 'icon--xs sb-chevron'} />
                    </button>
                  )}
                  {(!closed || isRail) &&
                    g.children?.map((c) => (
                      <MenuItem key={c.screen} node={c} active={c.screen === activeScreen} rail={isRail} onClick={() => go(c.screen)} />
                    ))}
                </div>
              );
            })}
          </nav>
        </>
      )}

      {!overlay && (
        <div className="sb-footer">
          <button
            type="button"
            className="sb-footer__btn"
            onClick={() => setRail(!rail)}
            title={isRail ? t.expandSidebar : t.collapseSidebar}
            aria-label={isRail ? t.expandSidebar : t.collapseSidebar}
          >
            <SidebarIcon className="icon--sm" />
            {!isRail && <span>{t.collapseSidebar}</span>}
          </button>
        </div>
      )}
    </aside>
  );
}

function MenuItem({ node, active, rail, onClick }: { node: DrawerNode; active: boolean; rail: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={active ? 'sb-item sb-item--active' : 'sb-item'}
      aria-current={active ? 'page' : undefined}
      title={rail ? node.label : undefined}
      onClick={onClick}
    >
      <span className="sb-item__icon">{node.icon}</span>
      {!rail && <span className="sb-item__label">{node.label}</span>}
    </button>
  );
}
