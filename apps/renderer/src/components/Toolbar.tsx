import { MODULES, type ScreenId } from '../lib/navigation';
import { formatShortcut } from '../lib/shortcuts';
import { ar } from '../i18n/ar';

interface Props {
  activeScreen: ScreenId;
  showBadges: boolean;
  onNavigate: (screen: ScreenId) => void;
  onToggleDrawer: () => void;
  onToggleBadges: () => void;
}

/**
 * Persistent top toolbar — blueprint §1.1.
 *
 * Always visible, even inside a form: staff can jump from a half-finished
 * customer record straight to a sale.
 */
export function Toolbar({
  activeScreen,
  showBadges,
  onNavigate,
  onToggleDrawer,
  onToggleBadges,
}: Props) {
  return (
    <header className="toolbar">
      <div className="toolbar__side">
        <button
          type="button"
          className="toolbar__icon"
          onClick={onToggleDrawer}
          title={ar.shell.toggleDrawer}
          aria-label={ar.shell.toggleDrawer}
        >
          ☰
        </button>
      </div>

      <nav className="toolbar__modules">
        {MODULES.map((m) => {
          const active = activeScreen === m.target;
          return (
            <button
              key={m.id}
              type="button"
              className={active ? 'module module--active' : 'module'}
              onClick={() => onNavigate(m.target)}
            >
              <span className="module__label">{m.label}</span>
              {showBadges && (
                <span className="module__badge" dir="ltr">
                  {formatShortcut(m.shortcut)}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="toolbar__side toolbar__side--end">
        <label className="toolbar__toggle">
          <input type="checkbox" checked={showBadges} onChange={onToggleBadges} />
          <span>{ar.shell.showShortcutBadges}</span>
        </label>
      </div>
    </header>
  );
}
