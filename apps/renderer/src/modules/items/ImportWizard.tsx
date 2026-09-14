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
import { ar } from '../../i18n/ar';
import { Stat } from '../../components/Stat';

type Phase = 'idle' | 'previewing' | 'ready' | 'applying' | 'done';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

const fill = (template: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), template);

export function ImportWizard({ onClose, onImported }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
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
      setPreview(await window.api.import.preview(path));
      setPhase('ready');
    } catch (err) {
      setError((err as Error).message);
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
      setPreview(await window.api.import.preview(preview.filePath, mapping));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPhase('ready');
    }
  }

  async function apply() {
    if (!preview || !window.api) return;
    if (preview.acceptedCount === 0) return setError(ar.items.import.nothingToImport);

    setPhase('applying');
    setProgress({ done: 0, total: preview.acceptedCount });
    try {
      const result = await window.api.import.apply(preview.filePath, preview.mapping);
      setSummary(
        result.rejectedCount > 0
          ? fill(ar.items.import.doneWithRejects, {
              count: result.inserted,
              rejected: result.rejectedCount,
            })
          : fill(ar.items.import.done, {
              count: result.inserted,
              seconds: (result.elapsedMs / 1000).toFixed(1),
            })
      );
      setPhase('done');
      onImported();
    } catch (err) {
      setError((err as Error).message);
      setPhase('ready');
    }
  }

  async function exportRejects() {
    if (!preview || !window.api) return;
    const csv = rejectedToCsv(preview.rejected, preview.headers);
    const path = await window.api.import.saveRejects(csv);
    if (path) setSavedPath(path);
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

          <div className="stats">
            <Stat label={ar.items.import.totalRows} value={String(preview.totalRows)} neutral />
            <Stat label={ar.items.import.accepted} value={String(preview.acceptedCount)} good />
            <Stat
              label={ar.items.import.rejected}
              value={String(preview.totalRows - preview.acceptedCount)}
              bad={preview.totalRows - preview.acceptedCount > 0}
            />
          </div>

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
              <table className="subtable">
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
              </table>
              {preview.totalRows - preview.acceptedCount > preview.rejected.length && (
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
            {phase === 'applying' ? ar.items.import.applying : ar.items.import.apply}
          </button>
        </>
      )}
    </div>
  );
}

