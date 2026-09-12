/**
 * scanner.ts — barcode scanner input layer (renderer process)
 *
 * Handles USB HID keyboard-wedge scanners.
 *
 * Detection modes:
 *   prefix  — scanner programmed to emit a prefix key (F9) before the data.
 *             Exact. Configure the scanner once at installation.
 *   timing  — fallback heuristic on inter-keystroke intervals.
 *
 * CRITICAL: this module reads KeyboardEvent.code, never .key.
 * With the Windows input language set to Arabic, .key returns Arabic letters
 * for a scanned alphanumeric barcode — 'PH4501A' arrives as 'صح4501ش'. The
 * lookup then fails, the pharmacist concludes the item is missing from the
 * database, and the bug looks like a data problem. .code is the physical key
 * and ignores layout entirely.
 *
 * Guards in this file:
 *   G1  Arabic contamination detector + QWERTY repair (catches any path that
 *       bypasses the code map — a stray .key read, a paste, an IME).
 *   G2  Prefix-capture watchdog. Without it, a scanner that never sends its
 *       terminator leaves the keyboard permanently swallowed.
 *   G3  Idle flush for scanners shipped with no suffix configured.
 *   G4  IME composition and auto-repeat suppression.
 *   G5  Diagnostics + self-test so installation problems are visible in
 *       Settings instead of being discovered at the counter.
 */

import { useEffect, useRef } from 'react';

export type ScanSource = 'prefix' | 'timing';

export type ScanRejection =
  | 'too_short'
  | 'too_long'
  | 'too_slow'
  | 'debounced'
  | 'arabic_unrecoverable';

export interface ScanEvent {
  /** Decoded barcode. Always a string — leading zeros are significant. */
  code: string;
  source: ScanSource;
  durationMs: number;
  at: number;
  /** True when G1 had to repair Arabic characters. Indicates a real problem. */
  repaired: boolean;
}

export interface ScannerConfig {
  /** KeyboardEvent.code of the programmed prefix, e.g. 'F9'. null = timing mode. */
  prefixCode: string | null;
  terminator: 'Enter' | 'Tab' | 'None';
  maxIntervalMs: number;
  minLength: number;
  maxLength: number;
  debounceMs: number;
  /** G2: release the keyboard if no terminator arrives within this window. */
  captureTimeoutMs: number;
  /** G3: with terminator 'None', evaluate the buffer after this idle gap. */
  idleFlushMs: number;
}

export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  prefixCode: null,
  terminator: 'Enter',
  maxIntervalMs: 35,
  minLength: 4,
  maxLength: 32,
  debounceMs: 300,
  captureTimeoutMs: 600,
  idleFlushMs: 120,
};

// ---------------------------------------------------------------------------
// Layout-independent character mapping
// ---------------------------------------------------------------------------

const CODE_TO_CHAR: Record<string, string> = {};

for (let i = 0; i <= 9; i++) {
  CODE_TO_CHAR[`Digit${i}`] = String(i);
  CODE_TO_CHAR[`Numpad${i}`] = String(i);
}
for (let i = 0; i < 26; i++) {
  CODE_TO_CHAR[`Key${String.fromCharCode(65 + i)}`] = String.fromCharCode(97 + i);
}
Object.assign(CODE_TO_CHAR, {
  Minus: '-',
  Equal: '=',
  Period: '.',
  Slash: '/',
  Backslash: '\\',
  Space: ' ',
  NumpadSubtract: '-',
  NumpadDecimal: '.',
  NumpadDivide: '/',
  NumpadMultiply: '*',
  NumpadAdd: '+',
});

function charFromEvent(e: KeyboardEvent): string | null {
  const base = CODE_TO_CHAR[e.code];
  if (base === undefined) return null;
  if (e.shiftKey && e.code.startsWith('Digit')) return null;
  if (e.shiftKey && e.code.startsWith('Key')) return base.toUpperCase();
  return base;
}

// ---------------------------------------------------------------------------
// G1 — Arabic contamination guard
// ---------------------------------------------------------------------------

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F]/;

/**
 * Arabic 101 layout → the Latin character on the same physical key.
 * This is a repair path, not a normal one. If it ever fires, something read
 * event.key, or the code arrived via paste or an IME. The diagnostics counter
 * is what you actually want: a non-zero value means a bug upstream.
 */
const ARABIC_TO_LATIN: Record<string, string> = {
  'ض': 'q', 'ص': 'w', 'ث': 'e', 'ق': 'r', 'ف': 't', 'غ': 'y', 'ع': 'u',
  'ه': 'i', 'خ': 'o', 'ح': 'p', 'ج': '[', 'د': ']',
  'ش': 'a', 'س': 's', 'ي': 'd', 'ب': 'f', 'ل': 'g', 'ا': 'h', 'ت': 'j',
  'ن': 'k', 'م': 'l', 'ك': ';', 'ط': "'",
  'ئ': 'z', 'ء': 'x', 'ؤ': 'c', 'ر': 'v', 'ى': 'n', 'ة': 'm',
  'و': ',', 'ز': '.', 'ظ': '/',
  // Arabic-Indic digits, which some layouts emit for the number row.
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function hasArabic(s: string): boolean {
  return ARABIC_RE.test(s);
}

/** Returns null when the string contains Arabic that cannot be mapped back. */
export function repairArabic(s: string): string | null {
  let out = '';
  for (const ch of s) {
    if (!ARABIC_RE.test(ch)) {
      out += ch;
      continue;
    }
    const latin = ARABIC_TO_LATIN[ch];
    if (latin === undefined) return null;
    out += latin.toUpperCase();
  }
  return out;
}

// ---------------------------------------------------------------------------
// Removing characters that leaked into a focused input (timing mode only)
// ---------------------------------------------------------------------------

function stripLeaked(text: string): void {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el) return;
  if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
  if (typeof el.value !== 'string') return;
  if (el.readOnly || el.disabled) return;

  const lower = el.value.toLowerCase();
  if (!lower.endsWith(text.toLowerCase())) return;

  const next = el.value.slice(0, el.value.length - text.length);
  const proto =
    el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, next);
  else el.value = next;

  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// ---------------------------------------------------------------------------
// G5 — Diagnostics
// ---------------------------------------------------------------------------

export interface ScannerDiagnostics {
  totalScans: number;
  prefixScans: number;
  timingScans: number;
  rejections: Record<ScanRejection, number>;
  /** Non-zero means event.key is leaking in somewhere. Investigate. */
  arabicContamination: number;
  /** Non-zero means the scanner terminator is misconfigured. */
  watchdogResets: number;
  medianIntervalMs: number | null;
  lastScanAt: number | null;
  mode: 'prefix' | 'timing';
  /** Set when timing margins are too tight for the heuristic to be safe. */
  warnings: string[];
}

const emptyRejections = (): Record<ScanRejection, number> => ({
  too_short: 0,
  too_long: 0,
  too_slow: 0,
  debounced: 0,
  arabic_unrecoverable: 0,
});

// ---------------------------------------------------------------------------
// Scanner
// ---------------------------------------------------------------------------

export interface ScannerHandle {
  detach: () => void;
  diagnostics: () => ScannerDiagnostics;
  /** Resolves on the next scan. For the Settings → Test scanner screen. */
  selfTest: (timeoutMs?: number) => Promise<ScannerSelfTest>;
}

export interface ScannerSelfTest {
  ok: boolean;
  code?: string;
  source?: ScanSource;
  medianIntervalMs?: number | null;
  repaired?: boolean;
  problems: string[];
  recommendation: string;
}

export interface ScannerOptions {
  config?: Partial<ScannerConfig>;
  /** Return true to ignore keystrokes entirely, e.g. while a modal is open. */
  shouldIgnore?: () => boolean;
  onReject?: (reason: ScanRejection, buffer: string) => void;
  /** Fired when a guard trips. Surface these — they are installation faults. */
  onGuard?: (guard: 'arabic' | 'watchdog', detail: string) => void;
}

export function createScanner(
  onScan: (event: ScanEvent) => void,
  options: ScannerOptions = {}
): ScannerHandle {
  const cfg = { ...DEFAULT_SCANNER_CONFIG, ...options.config };

  if (cfg.minLength < 3) {
    console.warn('[scanner] minLength below 3 will misread ordinary typing as scans.');
  }

  let buffer = '';
  let startedAt = 0;
  let lastKeyAt = 0;
  let inPrefixCapture = false;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  let lastCode = '';
  let lastCodeAt = 0;

  const intervals: number[] = [];
  const diag: ScannerDiagnostics = {
    totalScans: 0,
    prefixScans: 0,
    timingScans: 0,
    rejections: emptyRejections(),
    arabicContamination: 0,
    watchdogResets: 0,
    medianIntervalMs: null,
    lastScanAt: null,
    mode: cfg.prefixCode ? 'prefix' : 'timing',
    warnings: [],
  };

  let pending: ((t: ScannerSelfTest) => void) | null = null;

  const clearTimers = () => {
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  };

  const reset = () => {
    clearTimers();
    buffer = '';
    startedAt = 0;
    lastKeyAt = 0;
    inPrefixCapture = false;
  };

  const reject = (reason: ScanRejection) => {
    diag.rejections[reason] += 1;
    options.onReject?.(reason, buffer);
    reset();
  };

  const recordInterval = (gap: number) => {
    if (gap <= 0) return;
    intervals.push(gap);
    if (intervals.length > 60) intervals.shift();
    const sorted = [...intervals].sort((a, b) => a - b);
    diag.medianIntervalMs = sorted[Math.floor(sorted.length / 2)] ?? null;
  };

  const emit = (source: ScanSource, now: number) => {
    const raw = buffer;
    const duration = now - startedAt;
    reset();

    if (raw.length < cfg.minLength) return reject('too_short');
    if (raw.length > cfg.maxLength) return reject('too_long');

    // --- G1 -------------------------------------------------------------
    let code = raw;
    let repaired = false;

    if (hasArabic(raw)) {
      diag.arabicContamination += 1;
      const fixed = repairArabic(raw);
      if (fixed === null) {
        options.onGuard?.(
          'arabic',
          `Unmappable Arabic in scan "${raw}". A keyboard-layout-dependent read ` +
            `(event.key) is leaking in. Fix the source; do not rely on repair.`
        );
        return reject('arabic_unrecoverable');
      }
      code = fixed;
      repaired = true;
      options.onGuard?.(
        'arabic',
        `Repaired Arabic-contaminated scan "${raw}" → "${code}". Something bypassed ` +
          `the event.code map — investigate rather than shipping on the repair path.`
      );
    }

    if (code === lastCode && now - lastCodeAt < cfg.debounceMs) {
      diag.rejections.debounced += 1;
      return;
    }

    lastCode = code;
    lastCodeAt = now;

    diag.totalScans += 1;
    diag.lastScanAt = Date.now();
    if (source === 'prefix') diag.prefixScans += 1;
    else diag.timingScans += 1;

    // G5: timing mode running close to the human floor is unreliable.
    if (
      source === 'timing' &&
      diag.medianIntervalMs !== null &&
      diag.medianIntervalMs > cfg.maxIntervalMs * 0.7 &&
      !diag.warnings.length
    ) {
      diag.warnings.push(
        'Scan intervals are close to the detection threshold. Program the scanner ' +
          'with a prefix key and switch to prefix mode.'
      );
    }

    const event: ScanEvent = { code, source, durationMs: duration, at: now, repaired };
    onScan(event);

    if (pending) {
      const resolve = pending;
      pending = null;
      resolve(buildSelfTest(event));
    }
  };

  const buildSelfTest = (event: ScanEvent): ScannerSelfTest => {
    const problems: string[] = [];
    if (event.repaired) problems.push('Arabic contamination detected and repaired.');
    if (diag.watchdogResets > 0) problems.push('Terminator missing — watchdog fired.');
    if (event.source === 'timing') problems.push('Running on the timing heuristic.');
    if (diag.medianIntervalMs !== null && diag.medianIntervalMs > cfg.maxIntervalMs) {
      problems.push(`Median interval ${diag.medianIntervalMs}ms exceeds the ${cfg.maxIntervalMs}ms threshold.`);
    }

    return {
      ok: problems.length === 0,
      code: event.code,
      source: event.source,
      medianIntervalMs: diag.medianIntervalMs,
      repaired: event.repaired,
      problems,
      recommendation: problems.length
        ? 'Program the scanner with an F9 prefix and set terminator to Enter.'
        : 'Scanner configured correctly.',
    };
  };

  const handler = (e: KeyboardEvent) => {
    // --- G4 ---------------------------------------------------------------
    if (e.isComposing || e.keyCode === 229) return reset();
    if (e.repeat) return;
    if (options.shouldIgnore?.()) return reset();
    if (e.ctrlKey || e.altKey || e.metaKey) return reset();

    const now = performance.now();

    // ======================= prefix mode ==================================
    if (cfg.prefixCode) {
      if (e.code === cfg.prefixCode) {
        e.preventDefault();
        e.stopPropagation();
        clearTimers();
        buffer = '';
        startedAt = now;
        lastKeyAt = now;
        inPrefixCapture = true;

        // --- G2 ---------------------------------------------------------
        watchdog = setTimeout(() => {
          diag.watchdogResets += 1;
          const stuck = buffer;
          reset();
          options.onGuard?.(
            'watchdog',
            `No terminator after ${cfg.captureTimeoutMs}ms (buffer "${stuck}"). ` +
              `Keyboard released. Configure the scanner suffix to ${cfg.terminator}.`
          );
        }, cfg.captureTimeoutMs);
        return;
      }

      if (!inPrefixCapture) return;

      // Escape always releases the keyboard, whatever the scanner is doing.
      if (e.code === 'Escape') {
        reset();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Enter' || e.code === 'Tab' || e.code === cfg.terminator) {
        emit('prefix', now);
        return;
      }

      const ch = charFromEvent(e);
      if (ch !== null) {
        buffer += ch;
        recordInterval(now - lastKeyAt);
      }
      lastKeyAt = now;

      if (buffer.length > cfg.maxLength) {
        options.onGuard?.('watchdog', `Buffer exceeded ${cfg.maxLength} chars. Discarded.`);
        reject('too_long');
      }
      return;
    }

    // ======================= timing mode ==================================
    const gap = lastKeyAt === 0 ? 0 : now - lastKeyAt;

    if (e.code === 'Enter' || e.code === 'Tab') {
      const fast = gap <= cfg.maxIntervalMs;
      const longEnough = buffer.length >= cfg.minLength;

      if (fast && longEnough) {
        e.preventDefault();
        e.stopPropagation();
        const leaked = buffer;
        emit('timing', now);
        stripLeaked(leaked);
      } else {
        if (buffer.length && !fast) diag.rejections.too_slow += 1;
        reset();
      }
      return;
    }

    const ch = charFromEvent(e);
    if (ch === null) return reset();

    if (gap > cfg.maxIntervalMs) {
      buffer = ch;
      startedAt = now;
    } else {
      buffer += ch;
      recordInterval(gap);
      if (startedAt === 0) startedAt = now;
    }

    lastKeyAt = now;

    if (buffer.length > cfg.maxLength) return reject('too_long');

    // --- G3: scanner with no suffix configured ---------------------------
    if (cfg.terminator === 'None') {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (buffer.length >= cfg.minLength) {
          const leaked = buffer;
          emit('timing', performance.now());
          stripLeaked(leaked);
        } else {
          reset();
        }
      }, cfg.idleFlushMs);
    }
  };

  document.addEventListener('keydown', handler, true);

  return {
    detach: () => {
      clearTimers();
      document.removeEventListener('keydown', handler, true);
    },
    diagnostics: () => ({ ...diag, rejections: { ...diag.rejections } }),
    selfTest: (timeoutMs = 15000) =>
      new Promise<ScannerSelfTest>((resolve) => {
        pending = resolve;
        setTimeout(() => {
          if (!pending) return;
          pending = null;
          resolve({
            ok: false,
            problems: ['No scan received.'],
            recommendation:
              'Check the USB connection, then verify the scanner is in HID keyboard mode.',
          });
        }, timeoutMs);
      }),
  };
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

export function useBarcodeScanner(
  onScan: (event: ScanEvent) => void,
  options: ScannerOptions & { enabled?: boolean } = {}
): void {
  const { enabled = true, config, shouldIgnore, onReject, onGuard } = options;

  const scanRef = useRef(onScan);
  scanRef.current = onScan;
  const ignoreRef = useRef(shouldIgnore);
  ignoreRef.current = shouldIgnore;
  const rejectRef = useRef(onReject);
  rejectRef.current = onReject;
  const guardRef = useRef(onGuard);
  guardRef.current = onGuard;

  useEffect(() => {
    if (!enabled) return;
    const handle = createScanner((e) => scanRef.current(e), {
      config,
      shouldIgnore: () => ignoreRef.current?.() ?? false,
      onReject: (r, b) => rejectRef.current?.(r, b),
      onGuard: (g, d) => guardRef.current?.(g, d),
    });
    return handle.detach;
  }, [enabled, JSON.stringify(config ?? {})]);
}

// ---------------------------------------------------------------------------
// Barcode helpers
// ---------------------------------------------------------------------------

/** EAN-13 / EAN-8 check digit. A failure usually means a misread, not a gap. */
export function isValidEan(code: string): boolean {
  if (!/^\d{8}$|^\d{13}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const check = digits.pop()!;
  const weights = code.length === 13 ? [1, 3] : [3, 1];
  const sum = digits.reduce((acc, d, i) => acc + d * (weights[i % 2] ?? 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

export function classifyBarcode(code: string): 'ean13' | 'ean8' | 'code128' | 'internal' {
  if (/^\d{13}$/.test(code)) return 'ean13';
  if (/^\d{8}$/.test(code)) return 'ean8';
  if (/^\d{1,7}$/.test(code)) return 'internal';
  return 'code128';
}
