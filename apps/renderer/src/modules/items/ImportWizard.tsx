/**
 * Bulk item import — file, column mapping, validation preview, apply.
 *
 * Parsing and inserting happen in the db process; this screen only shows the
 * result and streams progress, so the window stays responsive while 35,000
 * rows go in.
 */

import { useEffect, useRef, useState } from 'react';
import type { ImportPreview, ImportProgressEvent } from '@pharmacy/shared';
import { IMPORTABLE_FIELDS, REQUIRED_FIELDS, rejectedToCsv, type ImportField } from '@pharmacy/core';
import type { ImportMode } from '@pharmacy/shared';
import { ar } from '../../i18n/ar';
import { Stat } from '../../components/Stat';
import { errorText } from '../../lib/errors';

type Phase = 'idle' | 'previewing' | 'ready' | 'applying' | 'done';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

const fill = (template: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), template);

export function ImportWizard({ onClose, onImported }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<ImportMode>('add');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const unsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!window.api) return;
    unsubscribe.current = window.api.import.onProgress(setProgress);
    return () => unsubscribe.current?.();
  }, []);

  async function pickFile() {
    if (!window.api) return setError(ar.status.noBridge);
    setError(null);
    const path = await window.api.import.pickFile();
    if (!path) return;

    setPhase('previewing');
    try {
      setPreview(await window.api.import.preview(path, undefined, mode));
      setPhase('ready');
    } catch (err) {
      setError(`${ar.items.import.errors.previewFailed}: ${errorText(err)}`);
      setPhase('idle');
    }
  }

  async function remap(field: ImportField, columnIndex: number | null) {
    if (!preview || !window.api) return;
    const mapping = { ...preview.mapping };
    if (columnIndex === null) delete mapping[field];
    else mapping[field] = columnIndex;

    setPhase('previewing');
    try {
      setPreview(await window.api.import.preview(preview.filePath, mapping, mode));
    } catch (err) {
      setError(`${ar.items.import.errors.previewFailed}: ${errorText(err)}`);
    } finally {
      setPhase('ready');
    }
  }

  /** Changing the mode re-plans which rows are new / existing / skipped. */
  async function changeMode(next: ImportMode) {
    setMode(next);
    if (!preview || !window.api) return;
    setPhase('previewing');
    try {
      setPreview(await window.api.import.preview(preview.filePath, preview.mapping, next));
    } catch (err) {
      setError(`${ar.items.import.errors.previewFailed}: ${errorText(err)}`);
    } finally {
      setPhase('ready');
    }
  }

  async function apply() {
    if (!preview || !window.api) return;
    if (preview.acceptedCount === 0) return setError(ar.items.import.nothingToImport);
    if (mode !== 'add' && preview.existingCount > 0 && !window.confirm(fill(ar.items.import.confirmUpdate, { n: preview.existingCount }))) return;

    setPhase('applying');
    setProgress({ done: 0, total: preview.acceptedCount });
    try {
      const result = await window.api.import.apply(preview.filePath, preview.mapping, mode);
      const parts = [
        fill(ar.items.import.result.inserted, { n: result.inserted }),
        fill(ar.items.import.result.updated, { n: result.updated }),
      ];
      if (result.skipped) parts.push(fill(ar.items.import.result.skipped, { n: result.skipped }));
      if (result.rejectedCount) parts.push(fill(ar.items.import.result.rejected, { n: result.rejectedCount }));
      if (result.unitsMismatch) parts.push(fill(ar.items.import.result.unitsMismatch, { n: result.unitsMismatch }));
      setSummary(parts.join(' · '));
      setPhase('done');
      onImported();
    } catch (err) {
      setError(`${ar.items.import.errors.applyFailed}: ${errorText(err)}`);
      setPhase('ready');
    }
  }

  async function exportRejects() {
    if (!preview || !window.api) return;
    try {
      const csv = rejectedToCsv(preview.rejected, preview.headers);
      const path = await window.api.import.saveRejects(csv);
      if (path) setSavedPath(path);
    } catch (err) {
      setError(`${ar.items.import.errors.exportFailed}: ${errorText(err)}`);
    }
  }

  return (
    <div className="import">
      <div className="import__bar">
        <button type="button" className="btn" onClick={onClose}>
          {ar.items.actions.back}
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void pickFile()}
          disabled={phase === 'applying' || phase === 'previewing'}
        >
          {ar.items.import.pickFile}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {summary && <div className="alert alert--info">{summary}</div>}
      {savedPath && (
        <div className="alert alert--info" dir="ltr">
          {fill(ar.items.import.exported, { path: savedPath })}
        </div>
      )}

      {phase === 'previewing' && <p className="muted">{ar.items.loading}</p>}

      {preview && phase !== 'done' && (
        <>
          <p className="muted small" dir="ltr">
            {preview.filePath}
          </p>

          <fieldset className="fieldset import-mode">
            <legend>{ar.items.import.mode.title}</legend>
            <div className="import-mode__options" role="radiogroup">
              {(['add', 'update', 'upsert'] as const).map((m) => (
                <label key={m} className={mode === m ? 'import-mode__option import-mode__option--active' : 'import-mode__option'}>
                  <input
                    type="radio"
                    name="importMode"
                    checked={mode === m}
                    disabled={phase === 'applying'}
                    onChange={() => void changeMode(m)}
                  />
                  <span>
                    <strong>{ar.items.import.mode[m]}</strong>
                    <span className="hint">{ar.items.import.mode[`${m}Hint`]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="stats">
            <Stat label={ar.items.import.totalRows} value={String(preview.totalRows)} neutral />
            <Stat label={ar.items.import.newItems} value={String(preview.newCount)} good={preview.newCount > 0} neutral={preview.newCount === 0} />
            <Stat label={ar.items.import.existingItems} value={String(preview.existingCount)} good={preview.existingCount > 0} neutral={preview.existingCount === 0} />
            {preview.skippedCount > 0 && <Stat label={ar.items.import.skippedItems} value={String(preview.skippedCount)} neutral />}
            <Stat
              label={ar.items.import.rejected}
              value={String(preview.totalRows - preview.acceptedCount - preview.skippedCount)}
              bad={preview.totalRows - preview.acceptedCount - preview.skippedCount > 0}
            />
          </div>
          {mode !== 'add' && preview.existingCount > 0 && <p className="hint">{ar.items.import.updateRule}</p>}

          <fieldset className="fieldset">
            <legend>{ar.items.import.mapping}</legend>
            <p className="hint">{ar.items.import.mappingHint}</p>
            <div className="grid2">
              {IMPORTABLE_FIELDS.map((field) => (
                <label className="formfield" key={field}>
                  <span className="formfield__label">
                    {ar.items.import.fields[field]}
                    {REQUIRED_FIELDS.includes(field) && <span className="req"> *</span>}
                  </span>
                  <select
                    className="field"
                    value={preview.mapping[field] ?? ''}
                    onChange={(e) =>
                      void remap(field, e.target.value === '' ? null : Number(e.target.value))
                    }
                  >
                    <option value="">{ar.items.import.notMapped}</option>
                    {preview.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `#${i + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>

          {preview.rejected.length > 0 && (
            <fieldset className="fieldset">
              <legend>{ar.items.import.rejectedTitle}</legend>
              <div className="table-wrap"><table className="subtable">
                <thead>
                  <tr>
                    <th>{ar.items.import.rowNumber}</th>
                    <th>{ar.items.import.reason}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rejected.slice(0, 15).map((r) => (
                    <tr key={r.rowNumber}>
                      <td dir="ltr">{r.rowNumber}</td>
                      <td>{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              {preview.totalRows - preview.acceptedCount - preview.skippedCount > preview.rejected.length && (
                <p className="hint">
                  {fill(ar.items.import.moreRejects, { shown: preview.rejected.length })}
                </p>
              )}
              <button type="button" className="btn btn--sm" onClick={() => void exportRejects()}>
                {ar.items.import.exportRejects}
              </button>
            </fieldset>
          )}

          {phase === 'applying' && progress && (
            <div className="progress">
              <div
                className="progress__fill"
                style={{ inlineSize: `${Math.round((progress.done / Math.max(progress.total, 1)) * 100)}%` }}
              />
              <span className="progress__label" dir="ltr">
                {fill(ar.items.import.progress, { done: progress.done, total: progress.total })}
              </span>
            </div>
          )}

          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void apply()}
            disabled={phase === 'applying' || preview.acceptedCount === 0}
          >
            {phase === 'applying' ? ar.items.import.applying : ar.items.import.applyMode[mode]}
          </button>
        </>
      )}
    </div>
  );
}

