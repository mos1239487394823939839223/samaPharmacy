/**
 * Multi-page workspace: every opened screen is a page (tab) listed in the
 * sidebar. Inactive pages stay mounted — hidden, not unmounted — so a
 * half-built invoice or a filtered report survives switching away and back.
 *
 * Because hidden pages are still mounted, anything that listens on the whole
 * document (keyboard shortcuts, the barcode scanner) must only act on the
 * ACTIVE page — otherwise a scan would land in a hidden invoice and F12
 * would pay it. `usePageActive()` is how a screen knows; the scanner hook
 * and `usePageShortcuts` use it automatically.
 */

import { createContext, useContext, useEffect, useRef, type DependencyList } from 'react';
import { attachShortcuts, type ShortcutBinding } from './shortcuts';

interface PageContextValue {
  active: boolean;
  /** Mark the page as holding unsaved work (closing it then asks first). */
  setDirty: (dirty: boolean) => void;
}

const PageContext = createContext<PageContextValue>({ active: true, setDirty: () => undefined });

export const PageProvider = PageContext.Provider;

/** True while this page is the one on screen. */
export function usePageActive(): boolean {
  return useContext(PageContext).active;
}

/** Report unsaved work on this page. */
export function usePageDirty(dirty: boolean): void {
  const { setDirty } = useContext(PageContext);
  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);
  useEffect(() => () => setDirty(false), [setDirty]);
}

/** Document-level shortcuts that only fire while this page is active. */
export function usePageShortcuts(bindings: () => ShortcutBinding[], deps: DependencyList): void {
  const active = usePageActive();
  useEffect(
    () => (active ? attachShortcuts(bindings()) : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, ...deps]
  );
}

/**
 * Re-run `reload` each time the page comes back on screen. Hidden pages keep
 * their state, so without this a shift screen left open shows the drawer
 * total from before the sales made in another tab.
 */
export function useRefreshOnActivate(reload: () => void): void {
  const active = usePageActive();
  const wasActive = useRef(active);
  const latest = useRef(reload);
  latest.current = reload;
  useEffect(() => {
    if (active && !wasActive.current) latest.current();
    wasActive.current = active;
  }, [active]);
}
