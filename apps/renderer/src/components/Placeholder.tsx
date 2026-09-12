import { SCREEN_LABELS, type ScreenId } from '../lib/navigation';
import { ar } from '../i18n/ar';

/** Stand-in for screens whose milestone has not run yet. */
export function Placeholder({ screen }: { screen: ScreenId }) {
  return (
    <div className="placeholder">
      <h2>{SCREEN_LABELS[screen]}</h2>
      <p className="muted">{ar.shell.notImplemented}</p>
      <p className="muted small">{ar.shell.notImplementedHint}</p>
      <code dir="ltr">{screen}</code>
    </div>
  );
}
