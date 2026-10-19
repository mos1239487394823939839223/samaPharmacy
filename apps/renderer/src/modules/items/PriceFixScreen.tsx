/**
 * تصحيح أسعار الوحدات — lists items whose strip/tablet is priced above its
 * share of the box (decision D9) and sets the suggested share price for the
 * ones the user ticks. Every change is in the audit log.
 */

import { useEffect, useState } from 'react';
import type { UnitPriceIssue } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { errorText } from '../../lib/errors';
import { useToast } from '../../components/Toast';

export function PriceFixScreen() {
  const [issues, setIssues] = useState<UnitPriceIssue[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function load() {
    try {
      const list = await window.api!.items.unitPriceIssues();
      setIssues(list);
      setSelected(new Set(list.map((i) => i.itemId)));
    } catch (err) {
      setError(errorText(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function apply() {
    if (selected.size === 0 || !window.confirm(ar.priceFix.confirm)) return;
    setBusy(true);
    setError(null);
    try {
      const count = await window.api!.items.fixUnitPrices([...selected]);
      showToast(ar.priceFix.applied.replace('{count}', String(count)));
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!issues) return error ? <div className="alert alert--error">{error}</div> : <p className="muted">{ar.items.loading}</p>;

  return (
    <div className="stack">
      <p className="hint">{ar.priceFix.intro}</p>
      {error && <div className="alert alert--error">{error}</div>}
      {issues.length === 0 ? (
        <div className="alert alert--success">{ar.priceFix.none}</div>
      ) : (
        <>
          <div className="btn-row" style={{ marginBlockStart: 0 }}>
            <label className="checkbox" style={{ marginBlockStart: 0 }}>
              <input
                type="checkbox"
                checked={selected.size === issues.length}
                onChange={(e) => setSelected(e.target.checked ? new Set(issues.map((i) => i.itemId)) : new Set())}
              />
              <span>{ar.priceFix.selectAll} ({issues.length})</span>
            </label>
            <button type="button" className="btn btn--primary" disabled={busy || selected.size === 0} onClick={() => void apply()}>
              {ar.priceFix.apply}
            </button>
          </div>
          <div className="table-wrap"><table className="datatable">
            <thead>
              <tr>
                <th />
                <th>{ar.priceFix.item}</th>
                <th>{ar.items.fields.publicPrice}</th>
                <th>{ar.priceFix.unit}</th>
                <th>{ar.priceFix.current}</th>
                <th>{ar.priceFix.suggested}</th>
              </tr>
            </thead>
            <tbody>
              {issues.flatMap((issue) =>
                issue.units.map((u, i) => (
                  <tr key={`${issue.itemId}-${u.unitId}`}>
                    <td>
                      {i === 0 && (
                        <input type="checkbox" checked={selected.has(issue.itemId)} onChange={() => toggle(issue.itemId)} />
                      )}
                    </td>
                    <td>{i === 0 ? issue.nameAr : ''}</td>
                    <td dir="ltr">{i === 0 && issue.publicPrice != null ? fromPiastres(issue.publicPrice) : ''}</td>
                    <td>
                      {u.nameAr} <span className="muted small">×{u.factor}</span>
                    </td>
                    <td dir="ltr" className="text-bad">{fromPiastres(u.salePrice)}</td>
                    <td dir="ltr" className="strong">{fromPiastres(u.suggested)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table></div>
        </>
      )}
    </div>
  );
}
