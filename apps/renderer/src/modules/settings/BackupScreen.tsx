/**
 * النسخ الاحتياطي — spec M11.
 *
 * Backups run by themselves (every N hours, on every close, before every
 * database upgrade); this screen shows that they are happening, lets the
 * owner add a second destination (USB / another PC — a dead disk takes the
 * local copies with it), take one now, and restore. Restore always backs up
 * the current state first, so it can be undone.
 */

import { useEffect, useState } from 'react';
import type { BackupStatus, PharmacySettings } from '@pharmacy/shared';
import { toAsciiDigits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { useToast } from '../../components/Toast';
import { errorText } from '../../lib/errors';

type ReasonKey = keyof typeof ar.backup.reasons;

function sizeLabel(bytes: number): string {
  return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

export function BackupScreen() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [secondaryDir, setSecondaryDir] = useState('');
  const [keep, setKeep] = useState('');
  const [interval, setIntervalHours] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function load() {
    if (!window.api) return setError(ar.status.noBridge);
    try {
      const [st, s] = await Promise.all([window.api.backup.status(), window.api.settings.get()]);
      setStatus(st);
      setSettings(s);
      setSecondaryDir(s.backup.secondaryDir);
      setKeep(String(s.backup.keep));
      setIntervalHours(String(s.backup.intervalHours));
    } catch (err) {
      setError(errorText(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function run<T>(work: () => Promise<T>, done?: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await work();
      if (done) showToast(done);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function chooseFolder() {
    const dir = await window.api!.backup.pickFolder();
    if (dir) setSecondaryDir(dir);
  }

  async function saveSettings() {
    const keepN = Number(toAsciiDigits(keep));
    const hoursN = Number(toAsciiDigits(interval));
    if (!Number.isInteger(keepN) || keepN < 1 || keepN > 365) return setError(ar.backup.keepInvalid);
    if (!Number.isInteger(hoursN) || hoursN < 1 || hoursN > 24) return setError(ar.backup.intervalInvalid);
    await run(
      () =>
        window.api!.settings.update({
          backup: {
            secondaryDir,
            keep: keepN,
            intervalHours: hoursN,
          },
        }),
      ar.settings.saved
    );
  }

  async function restore() {
    if (!window.confirm(ar.backup.restoreConfirm)) return;
    await run(async () => {
      const ok = await window.api!.backup.restore();
      if (ok) showToast(ar.backup.restored);
    });
  }

  if (!status || !settings) {
    return error ? <div className="alert alert--error">{error}</div> : <p className="muted">{ar.items.loading}</p>;
  }

  return (
    <div className="stack">
      {error && <div className="alert alert--error">{error}</div>}
      {status.lastError && (
        <div className="alert alert--error">
          {ar.backup.lastError}: <span dir="ltr">{status.lastError}</span>
        </div>
      )}

      <div className="panel stack">
        <div className="formfield">
          <span className="formfield__label">{ar.backup.primaryDir}</span>
          <span dir="ltr" className="small path-text">{status.primaryDir}</span>
        </div>

        <label className="formfield">
          <span className="formfield__label">{ar.backup.secondaryDir}</span>
          <div className="inline-field">
            <input className="field" dir="ltr" value={secondaryDir} placeholder={ar.backup.noSecondary} readOnly onClick={() => void chooseFolder()} />
            <button type="button" className="btn btn--sm" onClick={() => void chooseFolder()}>
              {ar.backup.choose}
            </button>
            {secondaryDir && (
              <button type="button" className="btn btn--sm" onClick={() => setSecondaryDir('')}>
                {ar.backup.clear}
              </button>
            )}
          </div>
          {!secondaryDir && <span className="hint">{ar.backup.secondaryHint}</span>}
        </label>

        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.backup.interval}</span>
            <input className="field field--sm" dir="ltr" inputMode="numeric" value={interval} onChange={(e) => setIntervalHours(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.backup.keep}</span>
            <input className="field field--sm" dir="ltr" inputMode="numeric" value={keep} onChange={(e) => setKeep(e.target.value)} />
          </label>
        </div>

        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void saveSettings()}>
            {ar.backup.save}
          </button>
          <button type="button" className="btn" disabled={busy} onClick={() => void run(() => window.api!.backup.run(), ar.backup.done)}>
            {ar.backup.runNow}
          </button>
          <button type="button" className="btn btn--danger" disabled={busy} onClick={() => void restore()}>
            {ar.backup.restore}
          </button>
        </div>
      </div>

      <fieldset className="fieldset">
        <legend>{ar.backup.list}</legend>
        {status.backups.length === 0 ? (
          <p className="muted">{ar.backup.none}</p>
        ) : (
          <div className="table-wrap"><table className="subtable">
            <thead>
              <tr>
                <th>{ar.backup.takenAt}</th>
                <th>{ar.backup.reason}</th>
                <th>{ar.backup.size}</th>
              </tr>
            </thead>
            <tbody>
              {status.backups.slice(0, 15).map((b) => (
                <tr key={b.path}>
                  <td dir="ltr">{b.takenAt}</td>
                  <td>{ar.backup.reasons[b.reason as ReasonKey] ?? b.reason}</td>
                  <td dir="ltr">{sizeLabel(b.size)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </fieldset>
    </div>
  );
}
