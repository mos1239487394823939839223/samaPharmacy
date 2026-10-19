/**
 * The pharmacy's name — one value shared by the header and the settings
 * screens. It lives in settings (pharmacy.profile, the same name printed on
 * receipts); editing it anywhere updates every place that shows it.
 */

import { useEffect, useState } from 'react';

let current: string | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<(name: string) => void>();

function publish(name: string) {
  current = name;
  for (const l of listeners) l(name);
}

function load(): Promise<void> {
  loading ??= (window.api?.settings.get() ?? Promise.reject(new Error('no bridge')))
    .then((s) => publish(s.pharmacy.name ?? ''))
    .catch(() => {
      loading = null;
    });
  return loading;
}

/** Tell every listener the name changed (after a settings save elsewhere). */
export function pharmacyNameChanged(name: string): void {
  publish(name);
}

/** Save a new name to settings and show it everywhere. */
export async function savePharmacyName(name: string): Promise<void> {
  const clean = name.trim();
  await window.api!.settings.update({ pharmacy: { name: clean } });
  publish(clean);
}

export function usePharmacyName(): string | null {
  const [name, setName] = useState<string | null>(current);
  useEffect(() => {
    listeners.add(setName);
    if (current === null) void load();
    else setName(current);
    return () => {
      listeners.delete(setName);
    };
  }, []);
  return name;
}
