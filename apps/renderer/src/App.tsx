/**
 * Application shell — blueprint §1.1 and §3 screen 1.
 *
 * Toolbar, drawer and the shortcut layer. Every module routes to a placeholder
 * until its own milestone builds it. The keyboard model is deliberately built
 * first: rule 12 says no POS interaction may require the mouse, and that is far
 * cheaper to honour from the start than to retrofit.
 */

import { useEffect, useMemo, useState } from 'react';
import type { RendererApi } from '@pharmacy/shared';
import { Toolbar } from './components/Toolbar';
import { Drawer } from './components/Drawer';
import { Placeholder } from './components/Placeholder';
import { HealthCheck } from './components/HealthCheck';
import { MODULES, SCREEN_LABELS, type ScreenId } from './lib/navigation';
import { attachShortcuts, type ShortcutBinding } from './lib/shortcuts';

declare global {
  interface Window {
    api: RendererApi;
  }
}

const BADGES_KEY = 'ui.showShortcutBadges';
const DRAWER_KEY = 'ui.drawerOpen';

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

export function App() {
  const [screen, setScreen] = useState<ScreenId>('health');
  const [drawerOpen, setDrawerOpen] = useState(() => readFlag(DRAWER_KEY, true));
  const [showBadges, setShowBadges] = useState(() => readFlag(BADGES_KEY, true));

  useEffect(() => {
    try {
      localStorage.setItem(DRAWER_KEY, String(drawerOpen));
    } catch {
      /* private mode or blocked storage — the toggle still works this session */
    }
  }, [drawerOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(BADGES_KEY, String(showBadges));
    } catch {
      /* as above */
    }
  }, [showBadges]);

  const bindings = useMemo<ShortcutBinding[]>(
    () =>
      MODULES.map((m) => ({
        id: m.id,
        ...m.shortcut,
        run: () => setScreen(m.target),
      })),
    []
  );

  useEffect(() => attachShortcuts(bindings), [bindings]);

  return (
    <div className="shell">
      <Toolbar
        activeScreen={screen}
        showBadges={showBadges}
        onNavigate={setScreen}
        onToggleDrawer={() => setDrawerOpen((v) => !v)}
        onToggleBadges={() => setShowBadges((v) => !v)}
      />

      <div className="shell__body">
        <Drawer open={drawerOpen} activeScreen={screen} onNavigate={setScreen} />

        <main className="shell__content">
          <h1 className="shell__heading">{SCREEN_LABELS[screen]}</h1>
          {screen === 'health' ? <HealthCheck /> : <Placeholder screen={screen} />}
        </main>
      </div>
    </div>
  );
}
