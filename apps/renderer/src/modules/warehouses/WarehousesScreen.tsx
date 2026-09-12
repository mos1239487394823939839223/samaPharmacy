/**
 * المخازن — simple list with inline add/edit. No paging: a pharmacy has a
 * handful of warehouses (main store, front counter), not thousands.
 */

import { useEffect, useState } from 'react';
import type { WarehouseRow } from '@pharmacy/shared';
import { ar } from '../../i18n/ar';

export function WarehousesScreen() {
  const [rows, setRows] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<WarehouseRow | 'new' | null>(null);
  const [nameAr, setNameAr] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  async function load() {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(await window.api.warehouses.list());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function startEdit(row: WarehouseRow | 'new') {
    setEditing(row);
    setNameAr(row === 'new' ? '' : row.nameAr);
    setIsDefault(row !== 'new' && Boolean(row.isDefault));
    setError(null);
  }

  async function save() {
    if (!window.api || !nameAr.trim()) return;
    try {
      if (editing === 'new') {
        await window.api.warehouses.create({ nameAr: nameAr.trim(), isDefault });
      } else if (editing) {
        await window.api.warehouses.update(editing.id, { nameAr: nameAr.trim(), isDefault });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function deactivate(row: WarehouseRow) {
    if (!window.api) return;
    if (!confirm(ar.warehouses.confirmDeactivate)) return;
    try {
      await window.api.warehouses.deactivate(row.id);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="items">
      <div className="items__bar">
        <button type="button" className="btn btn--primary" onClick={() => startEdit('new')}>
          {ar.warehouses.add}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {editing && (
        <div className="panel" style={{ marginBlockEnd: '1rem' }}>
          <div className="grid2">
            <label className="formfield">
              <span className="formfield__label">{ar.warehouses.name}</span>
              <input className="field" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
            </label>
            <label className="check" style={{ alignSelf: 'end' }}>
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              <span>{ar.warehouses.isDefault}</span>
            </label>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBlockStart: '0.75rem' }}>
            <button type="button" className="btn btn--primary" onClick={() => void save()}>
              {ar.items.actions.save}
            </button>
            <button type="button" className="btn" onClick={() => setEditing(null)}>
              {ar.items.actions.cancel}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="muted">{ar.items.loading}</p>
      ) : rows.length === 0 ? (
        <p className="muted">{ar.warehouses.empty}</p>
      ) : (
        <table className="datatable">
          <thead>
            <tr>
              <th>{ar.warehouses.name}</th>
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.nameAr}</td>
                <td>{Boolean(r.isDefault) && <span className="badge">{ar.warehouses.default}</span>}</td>
                <td className="datatable__actions">
                  <button type="button" className="btn btn--sm" onClick={() => startEdit(r)}>
                    {ar.items.edit}
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => void deactivate(r)}
                    disabled={Boolean(r.isDefault)}
                  >
                    {ar.items.deactivate}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
