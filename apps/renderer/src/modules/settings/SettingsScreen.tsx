/**
 * الإعدادات العامة — screen 15/16 of this build phase.
 *
 * Two different storage layers on one screen, and the form deliberately
 * doesn't hide that: expiry-bucket days and the sales return window are
 * pharmacy-wide business policy, so they live in the `settings` SQLite
 * table and apply to every till. Scanner tuning is a property of the
 * physical device plugged into *this* machine, so it stays in
 * localStorage (apps/renderer/src/hardware/config.ts) exactly as it did
 * before this screen existed — a second till with a different scanner
 * model needs different numbers, not a synced copy of this one's.
 */

import { useEffect, useState } from 'react';
import type { PharmacySettings } from '@pharmacy/shared';
import { ar } from '../../i18n/ar';
import {
  loadScannerConfig,
  saveScannerConfig,
  INSTALLED_SCANNER_CONFIG,
} from '../../hardware/config';
import { createScanner, type ScannerConfig } from '../../hardware/scanner';

export function SettingsScreen() {
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [d30, setD30] = useState('');
  const [d60, setD60] = useState('');
  const [d90, setD90] = useState('');
  const [d180, setD180] = useState('');
  const [returnWindowDays, setReturnWindowDays] = useState('');

  const [scanner, setScanner] = useState<ScannerConfig>(() => loadScannerConfig());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [testState, setTestState] = useState<'idle' | 'waiting' | 'ok' | 'failed'>('idle');
  const [testCode, setTestCode] = useState<string | null>(null);
  const [testProblems, setTestProblems] = useState<string[]>([]);

  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const s = await window.api.settings.get();
      setSettings(s);
      setD30(String(s.expiryBucketDays.d30));
      setD60(String(s.expiryBucketDays.d60));
      setD90(String(s.expiryBucketDays.d90));
      setD180(String(s.expiryBucketDays.d180));
      setReturnWindowDays(String(s.salesReturnWindowDays));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    if (!window.api) return;
    setError(null);
    setNotice(null);

    const bucketDays = {
      d30: Number(d30),
      d60: Number(d60),
      d90: Number(d90),
      d180: Number(d180),
    };
    if (!(bucketDays.d30 > 0 && bucketDays.d30 < bucketDays.d60 && bucketDays.d60 < bucketDays.d90 && bucketDays.d90 < bucketDays.d180)) {
      setError(ar.settings.expiryOrderError);
      return;
    }
    const windowDays = Number(returnWindowDays);
    if (!(Number.isInteger(windowDays) && windowDays > 0)) {
      setError(ar.settings.expiryOrderError);
      return;
    }

    setSaving(true);
    try {
      const updated = await window.api.settings.update({
        expiryBucketDays: bucketDays,
        salesReturnWindowDays: windowDays,
      });
      setSettings(updated);
      saveScannerConfig(scanner);
      setNotice(ar.settings.saved);
    } catch (err) {
      setError(`${ar.settings.saveFailed}: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  function resetScanner() {
    setScanner(INSTALLED_SCANNER_CONFIG);
  }

  function testScanner() {
    setTestState('waiting');
    setTestCode(null);
    setTestProblems([]);
    // onScan is a no-op here — the scan that resolves selfTest() is captured
    // internally by createScanner itself; this callback exists only for a
    // live POS screen wiring the actual "add to cart" behavior.
    const handle = createScanner(() => {}, { config: scanner });
    void handle.selfTest(15000).then((result) => {
      handle.detach();
      setTestCode(result.code ?? null);
      setTestProblems(result.problems);
      setTestState(result.ok ? 'ok' : 'failed');
    });
  }

  if (loading) return <p className="muted">{ar.items.loading}</p>;

  return (
    <div className="stack">
      {error && <div className="alert alert--error">{error}</div>}
      {notice && (
        <div className="alert alert--info">
          {notice}
          <button type="button" className="alert__close" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      <fieldset className="fieldset" style={{ marginBlockStart: 0 }}>
        <legend>{ar.settings.expirySection}</legend>
        <p className="hint">{ar.settings.expiryHint}</p>
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.settings.expiryD30}</span>
            <input
              className="field field--sm"
              dir="ltr"
              inputMode="numeric"
              value={d30}
              onChange={(e) => setD30(e.target.value)}
            />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.settings.expiryD60}</span>
            <input
              className="field field--sm"
              dir="ltr"
              inputMode="numeric"
              value={d60}
              onChange={(e) => setD60(e.target.value)}
            />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.settings.expiryD90}</span>
            <input
              className="field field--sm"
              dir="ltr"
              inputMode="numeric"
              value={d90}
              onChange={(e) => setD90(e.target.value)}
            />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.settings.expiryD180}</span>
            <input
              className="field field--sm"
              dir="ltr"
              inputMode="numeric"
              value={d180}
              onChange={(e) => setD180(e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>{ar.settings.returnsSection}</legend>
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.settings.returnWindowDays}</span>
            <input
              className="field field--sm"
              dir="ltr"
              inputMode="numeric"
              value={returnWindowDays}
              onChange={(e) => setReturnWindowDays(e.target.value)}
            />
          </label>
        </div>
        <p className="hint">{ar.settings.returnWindowHint}</p>
      </fieldset>

      <fieldset className="fieldset">
        <legend>{ar.settings.scannerSection}</legend>
        <p className="hint">{ar.settings.scannerHint}</p>
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.settings.scannerTerminator}</span>
            <select
              className="field"
              value={scanner.terminator}
              onChange={(e) =>
                setScanner((s) => ({ ...s, terminator: e.target.value as ScannerConfig['terminator'] }))
              }
            >
              <option value="Enter">{ar.settings.scannerTerminatorEnter}</option>
              <option value="Tab">{ar.settings.scannerTerminatorTab}</option>
              <option value="None">{ar.settings.scannerTerminatorNone}</option>
            </select>
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.settings.scannerMinLength}</span>
            <input
              className="field field--sm"
              dir="ltr"
              inputMode="numeric"
              value={scanner.minLength}
              onChange={(e) => setScanner((s) => ({ ...s, minLength: Number(e.target.value) || 0 }))}
            />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.settings.scannerMaxLength}</span>
            <input
              className="field field--sm"
              dir="ltr"
              inputMode="numeric"
              value={scanner.maxLength}
              onChange={(e) => setScanner((s) => ({ ...s, maxLength: Number(e.target.value) || 0 }))}
            />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.settings.scannerMaxIntervalMs}</span>
            <input
              className="field field--sm"
              dir="ltr"
              inputMode="numeric"
              value={scanner.maxIntervalMs}
              onChange={(e) => setScanner((s) => ({ ...s, maxIntervalMs: Number(e.target.value) || 0 }))}
            />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.settings.scannerDebounceMs}</span>
            <input
              className="field field--sm"
              dir="ltr"
              inputMode="numeric"
              value={scanner.debounceMs}
              onChange={(e) => setScanner((s) => ({ ...s, debounceMs: Number(e.target.value) || 0 }))}
            />
          </label>
        </div>

        <div className="btn-row">
          <button type="button" className="btn btn--sm" onClick={testScanner} disabled={testState === 'waiting'}>
            {ar.settings.scannerTest}
          </button>
          <button type="button" className="btn btn--sm" onClick={resetScanner}>
            {ar.settings.scannerReset}
          </button>
        </div>

        {testState === 'waiting' && <p className="hint">{ar.settings.scannerTestWaiting}</p>}
        {testState === 'ok' && (
          <p className="hint">
            {ar.settings.scannerTestOk}
            {testCode && (
              <>
                {' — '}
                <span dir="ltr">{testCode}</span>
              </>
            )}
          </p>
        )}
        {testState === 'failed' && (
          <div className="alert alert--error">
            {testCode ? (
              <>
                <span dir="ltr">{testCode}</span>
                {testProblems.length > 0 && ' — ' + testProblems.join('؛ ')}
              </>
            ) : (
              ar.settings.scannerTestFailed
            )}
          </div>
        )}
      </fieldset>

      <div className="btn-row" style={{ marginBlockStart: 0 }}>
        <button type="button" className="btn btn--primary" onClick={() => void save()} disabled={saving}>
          {ar.settings.save}
        </button>
      </div>
    </div>
  );
}
