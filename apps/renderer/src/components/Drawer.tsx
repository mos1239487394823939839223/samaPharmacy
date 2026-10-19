import type { ReactNode } from 'react';
import { DRAWER_TREE, type ScreenId } from '../lib/navigation';

import { ar } from '../i18n/ar';
import { HomeIcon } from './icons';

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

/** The icon of the menu group a screen belongs to (the home icon for the dashboard). */
function pageIcon(screen: ScreenId) {
  if (screen === 'dashboard') return <HomeIcon className="icon--sm" />;
  const group = DRAWER_TREE.find((g) => g.children?.some((c) => c.screen === screen));
  return group?.icon ?? <HomeIcon className="icon--sm" />;
}

function MenuLink({ label, active, icon, onClick }: { label: string; active: boolean; icon?: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className={active ? 'nav-link nav-link--active' : 'nav-link'} aria-current={active ? 'page' : undefined} onClick={onClick}>
      {icon && <span className="nav-link__icon">{icon}</span>}
      {label}
    </button>
  );
}

/**
 * The sidebar: the open pages (tabs) on top, the full menu below. Two
 * regions that scroll on their own — the open pages never slide over the
 * menu. Menu groups are plain headings, always expanded: every screen is
 * one click away and never hidden inside a collapsed section.
 */
export function Drawer({ open, overlay = false, activeScreen, onNavigate, pages, activePageId, onSelectPage, onClosePage, onNewSale }: Props) {
  if (!open) return null;

  return (
    <aside className={overlay ? 'sidebar sidebar--overlay' : 'sidebar'}>
      <section className="open-pages" aria-label={ar.workspace.openPages}>
        <div className="open-pages__header">
          <span className="open-pages__title">
            {ar.workspace.openPages}
            <span className="open-pages__count">{pages.length}</span>
          </span>
          <button type="button" className="open-pages__add" onClick={onNewSale} title={ar.workspace.newSaleTitle} aria-label={ar.workspace.newSaleTitle}>
            + {ar.workspace.newSaleShort}
          </button>
        </div>
        <ul className="open-pages__list" title={ar.workspace.hint}>
          {pages.map((p) => {
            const isActive = p.id === activePageId;
            return (
              <li key={p.id} className={isActive ? 'open-page open-page--active' : 'open-page'}>
                <button
                  type="button"
                  className="open-page__select"
                  onClick={() => onSelectPage(p.id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={p.dirty ? `${p.label} — ${ar.workspace.unsaved}` : p.label}
                >
                  <span className="open-page__icon">{pageIcon(p.screen)}</span>
                  <span className="open-page__label">{p.label}</span>
                  {p.dirty && <span className="open-page__dot" aria-label={ar.workspace.unsaved} />}
                </button>
                <button
                  type="button"
                  className="open-page__close"
                  onClick={() => onClosePage(p.id)}
                  title={ar.workspace.close}
                  aria-label={`${ar.workspace.close} — ${p.label}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <nav className="nav" aria-label={ar.workspace.menu}>
        <MenuLink label={ar.drawer.home} icon={<HomeIcon className="icon--sm" />} active={activeScreen === 'dashboard'} onClick={() => onNavigate('dashboard')} />
        {DRAWER_TREE.map((group) => (
          <div key={group.label} className="nav-group">
            <div className="nav-group__title">
              {group.icon}
              {group.label}
            </div>
            {group.children?.map((child) => (
              <MenuLink
                key={child.screen}
                label={child.label}
                active={child.screen === activeScreen}
                onClick={() => child.screen && onNavigate(child.screen)}
              />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
