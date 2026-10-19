/**
 * تسويات المخزون — write off damaged / expired / lost stock, or correct the
 * system to a physical count.
 *
 * Pick the item, type the quantity actually on the shelf for each batch, pick
 * a reason, save. The difference is posted as one stock adjustment with a
 * stock_moves row per batch (rule 8). Nothing here deletes or edits history —
 * a mistaken adjustment is corrected by another adjustment.
 */

import { Fragment, useEffect, useRef, useState } from 'react';
import type {
  AdjustmentMoveRow,
  AdjustmentReason,
  BatchRow,
  ItemListRow,
  StockAdjustmentRow,
  WarehouseRow,
} from '@pharmacy/shared';
import { fromPiastres, toAsciiDigits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { useToast } from '../../components/Toast';
import { EmptyState } from '../../components/EmptyState';
import { errorText } from '../../lib/errors';
import { describeQty, loadUnits, type UnitOption } from '../../lib/units';
import { SearchInput } from '../../components/SearchInput';

const REASONS: AdjustmentReason[] = ['damage', 'expiry', 'theft', 'correction', 'count'];
const NOTE_REQUIRED: AdjustmentReason[] = ['theft', 'correction'];

/** A physical count, typed per unit: e.g. 2 علبة + 1 شريط + 3 قرص. */
interface CountRow {
  batch: BatchRow;
  /** Typed quantity per unit id. */
  counts: Record<number, string>;
}

/** Split a base-unit quantity into whole units, largest first (60 قرص → 3 علبة). */
function splitQty(base: number, units: UnitOption[]): Record<number, string> {
  const out: Record<number, string> = {};
  let rest = base;
  for (const u of units) {
    const n = Math.floor(rest / u.factor);
    out[u.id] = n ? String(n) : '';
    rest -= n * u.factor;
  }
  // Units are loaded largest first and always include factor 1, so rest is 0
  // — unless the item has no base unit; then keep the remainder visible.
  const base1 = units.find((u) => u.factor === 1);
  if (rest && base1) out[base1.id] = String(Number(out[base1.id] || 0) + rest);
  return out;
}

/** Every unit's whole-number breakdown, e.g. "2 علبة + 1 شريط". */
function formatQty(base: number, units: UnitOption[]): string {
  if (units.length === 0) return String(base);
  const parts = splitQty(base, units);
  const text = units.filter((u) => parts[u.id]).map((u) => `${parts[u.id]} ${u.nameAr}`);
  return text.length ? text.join(' + ') : `0 ${units[units.length - 1]!.nameAr}`;
}

export function StockAdjustmentsScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemListRow[]>([]);
  const [item, setItem] = useState<ItemListRow | null>(null);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [rows, setRows] = useState<CountRow[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [reason, setReason] = useState<AdjustmentReason>('damage');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<StockAdjustmentRow[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [moves, setMoves] = useState<AdjustmentMoveRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  async function loadHistory() {
    if (!window.api) return;
    setHistory(await window.api.adjustments.list(50));
  }

  useEffect(() => {
    if (!window.api) {
      setError(ar.status.noBridge);
      return;
    }
    void window.api.warehouses.list().then(setWarehouses);
    void loadHistory();
  }, []);

  useEffect(() => {
    if (!window.api || !query.trim()) {
      setResults([]);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      void window.api!.items.search(query, 10).then(setResults);
    }, 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query]);

  async function pick(it: ItemListRow) {
    if (!window.api) return;
    setError(null);
    setItem(it);
    setQuery('');
    setResults([]);
    const [batches, u] = await Promise.all([window.api.stock.batches(it.id), loadUnits(it.id)]);
    setUnits(u);
    setRows(batches.filter((b) => b.qtyOnHand > 0).map((b) => ({ batch: b, counts: splitQty(b.qtyOnHand, u) })));
  }

  /** Counted quantity in base units (tablets): Σ qty × factor. Null when a field is not a whole number. */
  function counted(row: CountRow): number | null {
    let total = 0;
    for (const u of units) {
      const text = (row.counts[u.id] ?? '').trim();
      if (!text) continue;
      const n = Number(toAsciiDigits(text));
      if (!Number.isInteger(n) || n < 0) return null;
      total += n * u.factor;
    }
    return total;
  }

  const baseName = units.find((u) => u.factor === 1)?.nameAr ?? '';
  const changes = rows.filter((r) => counted(r) !== null && counted(r) !== r.batch.qtyOnHand);

  async function save() {
    if (!window.api || saving) return;
    setError(null);
    if (rows.some((r) => counted(r) === null)) return setError(ar.errors['adjust.qtyInvalid']);
    if (changes.length === 0) return setError(ar.adjustments.nothingChanged);
    if (NOTE_REQUIRED.includes(reason) && !note.trim()) return setError(ar.errors['adjust.noteRequired']);
    if (reason !== 'count' && reason !== 'correction' && changes.some((r) => counted(r)! > r.batch.qtyOnHand)) {
      return setError(ar.errors['adjust.increaseNotAllowed']);
    }

    setSaving(true);
    try {
      const input = {
        reasonCode: reason,
        note: note.trim() || null,
        lines: changes.map((r) => ({ batchId: r.batch.id, countedQty: counted(r)! })),
      };
      const id = await window.api.adjustments.create(input);
      showToast(ar.adjustments.saved.replace('{id}', String(id)));
      setNote('');
      if (item) await pick(item);
      await loadHistory();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: number) {
    if (!window.api) return;
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    setMoves(await window.api.adjustments.moves(id));
  }

  return (
    <div className="stack">
      <p className="hint">{ar.adjustments.intro}</p>

      <div className="items__bar field-wrap">
        <SearchInput
          className="field items__search"
          placeholder={ar.adjustments.search}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => (e.code === 'Enter' || e.code === 'NumpadEnter') && results[0] && void pick(results[0])}
        />
        {results.length > 0 && (
          <ul className="autocomplete autocomplete--offset">
            {results.map((it) => (
              <li key={it.id}>
                <button type="button" onClick={() => void pick(it)}>
                  <span>{it.nameAr}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {item && (
        <div className="panel stack">
          <h2 className="section-heading">{item.nameAr}</h2>
          {rows.length === 0 ? (
            <EmptyState title={ar.adjustments.noBatches} />
          ) : (
            <>
              <p className="hint">{ar.adjustments.unitHint}</p>
              {units.length > 1 && (
                <p className="hint">
                  {units
                    .filter((u) => u.factor > 1)
                    .map((u) => `1 ${u.nameAr} = ${u.factor} ${baseName}`)
                    .join(' · ')}
                </p>
              )}
              <div className="table-wrap"><table className="subtable">
                <thead>
                  <tr>
                    <th>{ar.stock.warehouseColumn}</th>
                    <th>{ar.adjustments.batch}</th>
                    <th>{ar.adjustments.expiry}</th>
                    <th>{ar.adjustments.systemQty}</th>
                    <th>{ar.adjustments.countedQty}</th>
                    <th>{ar.adjustments.difference}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const c = counted(r);
                    const diff = c === null ? null : c - r.batch.qtyOnHand;
                    return (
                      <tr key={r.batch.id}>
                        <td>{warehouses.find((w) => w.id === r.batch.warehouseId)?.nameAr ?? '—'}</td>
                        <td dir="ltr">
                          {r.batch.batchNumber ?? '—'}
                          {Boolean(r.batch.isQuarantined) && <span className="badge badge--muted"> {ar.adjustments.quarantined}</span>}
                        </td>
                        <td dir="ltr">{r.batch.expiryDate ?? '—'}</td>
                        <td>
                          <span className="strong">{formatQty(r.batch.qtyOnHand, units)}</span>
                          {units.length > 1 && (
                            <div className="muted small">
                              = <span dir="ltr">{r.batch.qtyOnHand}</span> {baseName}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="count-inputs">
                            {units.map((u) => (
                              <label key={u.id} className="count-input">
                                <input
                                  className={c === null ? 'field field--sm field--invalid' : 'field field--sm'}
                                  dir="ltr"
                                  inputMode="numeric"
                                  placeholder="0"
                                  aria-label={u.nameAr}
                                  value={r.counts[u.id] ?? ''}
                                  onChange={(e) =>
                                    setRows((prev) =>
                                      prev.map((x, j) =>
                                        j === i ? { ...x, counts: { ...x.counts, [u.id]: toAsciiDigits(e.target.value) } } : x
                                      )
                                    )
                                  }
                                />
                                <span>{u.nameAr}</span>
                              </label>
                            ))}
                          </div>
                          {units.length > 1 && c !== null && (
                            <div className="muted small">
                              = <span dir="ltr">{c}</span> {baseName}
                            </div>
                          )}
                        </td>
                        <td className={diff && diff < 0 ? 'text-bad' : diff ? 'strong' : 'muted'}>
                          {diff === null || diff === 0
                            ? '—'
                            : `${diff > 0 ? ar.adjustments.increase : ar.adjustments.decrease} ${describeQty(Math.abs(diff), units)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div>

              <div className="grid2">
                <label className="formfield">
                  <span className="formfield__label">{ar.adjustments.reason}</span>
                  <select className="field" value={reason} onChange={(e) => setReason(e.target.value as AdjustmentReason)}>
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {ar.adjustments.reasons[r]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="formfield">
                  <span className="formfield__label">
                    {ar.adjustments.note}
                    {NOTE_REQUIRED.includes(reason) && <span className="req"> * {ar.adjustments.noteRequired}</span>}
                  </span>
                  <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
                </label>
              </div>

              <div className="btn-row">
                <button type="button" className="btn btn--primary" disabled={saving || changes.length === 0} onClick={() => void save()}>
                  {ar.adjustments.save}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <fieldset className="fieldset">
        <legend>{ar.adjustments.history}</legend>
        {history.length === 0 ? (
          <p className="muted">{ar.adjustments.noHistory}</p>
        ) : (
          <div className="table-wrap"><table className="subtable">
            <thead>
              <tr>
                <th>#</th>
                <th>{ar.adjustments.date}</th>
                <th>{ar.adjustments.reason}</th>
                <th>{ar.adjustments.note}</th>
                <th>{ar.adjustments.lines}</th>
                <th>{ar.adjustments.qty}</th>
                <th>{ar.adjustments.value}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <Fragment key={h.id}>
                  <tr onClick={() => void toggle(h.id)} style={{ cursor: 'pointer' }}>
                    <td dir="ltr">{h.id}</td>
                    <td dir="ltr">{h.at.slice(0, 16)}</td>
                    <td>{ar.adjustments.reasons[h.reasonCode]}</td>
                    <td>{h.note ?? '—'}</td>
                    <td dir="ltr">{h.lineCount}</td>
                    <td dir="ltr">{h.qtyDelta > 0 ? `+${h.qtyDelta}` : h.qtyDelta}</td>
                    <td dir="ltr" className={h.valueDelta < 0 ? 'text-bad' : ''}>{fromPiastres(h.valueDelta)}</td>
                  </tr>
                  {openId === h.id &&
                    moves.map((m) => (
                      <tr key={`${h.id}-${m.batchId}`} className="muted">
                        <td />
                        <td colSpan={2}>{m.nameAr}</td>
                        <td dir="ltr">
                          {m.batchNumber ?? '—'} · {m.expiryDate ?? '—'}
                        </td>
                        <td />
                        <td dir="ltr">{m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}</td>
                        <td dir="ltr">{fromPiastres(m.qtyDelta * m.unitCost)}</td>
                      </tr>
                    ))}
                </Fragment>
              ))}
            </tbody>
          </table></div>
        )}
      </fieldset>
    </div>
  );
}
