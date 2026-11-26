/**
 * In-app change notifications. Every open page stays mounted, so when an item
 * is edited on its own page, the invoice that opened it (and any other page
 * showing it) must hear about it to refresh — no reload, no stale price.
 */

import { useEffect, useRef } from 'react';

const ITEM_UPDATED = 'pharmacy:item-updated';
const SHORTAGES_CHANGED = 'pharmacy:shortages-changed';

export function emitItemUpdated(itemId: number): void {
  window.dispatchEvent(new CustomEvent(ITEM_UPDATED, { detail: itemId }));
}

export function emitShortagesChanged(): void {
  window.dispatchEvent(new Event(SHORTAGES_CHANGED));
}

function useEvent(name: string, handler: (e: Event) => void): void {
  const latest = useRef(handler);
  latest.current = handler;
  useEffect(() => {
    const fn = (e: Event) => latest.current(e);
    window.addEventListener(name, fn);
    return () => window.removeEventListener(name, fn);
  }, [name]);
}

/** Runs with the id of every item saved anywhere in the app. */
export function useItemUpdated(handler: (itemId: number) => void): void {
  useEvent(ITEM_UPDATED, (e) => handler((e as CustomEvent<number>).detail));
}

export function useShortagesChanged(handler: () => void): void {
  useEvent(SHORTAGES_CHANGED, handler);
}
