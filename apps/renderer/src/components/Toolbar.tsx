import { ar } from '../i18n/ar';
import { MenuIcon, SearchIcon, BellIcon, PillIcon } from './icons';
import type { ScreenId } from '../lib/navigation';

interface Props {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  onToggleDrawer: () => void;
}

/**
 * Persistent top header — application identity, sidebar toggle, quick search
 * and utility actions. Module navigation itself lives in the sidebar now;
 * the header stays a light, uncluttered strip rather than a second row of
 * large buttons duplicating that tree.
 */
export function Toolbar({ onToggleDrawer }: Props) {
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

      <div className="header__brand">
        <span className="header__logo">
          <PillIcon className="icon--sm" />
        </span>
      </div>

      <div className="header__search">
        <span className="header__search-icon">
          <SearchIcon className="icon--sm" />
        </span>
        <input className="field" placeholder={ar.shell.search} />
      </div>

      <div className="header__spacer" />

      <div className="header__actions">
        <button type="button" className="header__toggle" title={ar.shell.notifications} aria-label={ar.shell.notifications}>
          <BellIcon />
        </button>

        <div className="header__user">
          <span className="header__user-avatar">ص</span>
          <span className="header__user-name">{ar.shell.pharmacist}</span>
        </div>
      </div>
    </header>
  );
}
