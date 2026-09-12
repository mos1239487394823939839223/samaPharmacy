/**
 * Scanner configuration for the installed device.
 *
 * The pharmacy's scanner is a UP-770pro. No manual or configuration sheet was
 * found for it (docs/hardware-device-profile.md), so it ships in timing mode:
 * `prefixCode: null`. If a sheet turns up, program an F9 prefix and an Enter
 * suffix, then set prefixCode to 'F9' and detection becomes exact rather than
 * heuristic.
 *
 * Decision D7 in docs/DECISIONS.md records why this is not yet settled.
 */

import { DEFAULT_SCANNER_CONFIG, type ScannerConfig } from './scanner';

const STORAGE_KEY = 'hardware.scanner';

export const INSTALLED_SCANNER_CONFIG: ScannerConfig = {
  ...DEFAULT_SCANNER_CONFIG,
  prefixCode: null,
  terminator: 'Enter',
  maxIntervalMs: 35,
  minLength: 4,
  debounceMs: 300,
};

export function loadScannerConfig(): ScannerConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INSTALLED_SCANNER_CONFIG;
    return { ...INSTALLED_SCANNER_CONFIG, ...(JSON.parse(raw) as Partial<ScannerConfig>) };
  } catch {
    return INSTALLED_SCANNER_CONFIG;
  }
}

export function saveScannerConfig(config: Partial<ScannerConfig>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* blocked storage — the session still works, the change just will not persist */
  }
}
