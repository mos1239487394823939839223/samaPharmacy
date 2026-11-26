/**
 * «إضافة للنواقص» — add an existing item to the shortages list, with an
 * optional quantity (in one of the item's units) and a note. Used from the
 * invoice, the items list, the item edit page and the النواقص page itself.
 */

import { useEffect, useState } from 'react';
import { toAsciiDigits } from '@pharmacy/core';
import type { ShortageRow } from '@pharmacy/shared';
import { ar } from '../i18n/ar';
import { useToast } from './Toast';
import { errorCode, errorText } from '../lib/errors';
import { loadUnits, type UnitOption } from '../lib/units';
import { emitShortagesChanged, useShortagesChanged } from '../lib/itemEvents';
import { useBusy } from '../lib/useBusy';

interface Props {
  itemId: number;
  itemName: string;
  /** Editing an existing shortage (quantity / note) instead of adding one. */
  existing?: ShortageRow | null;
  onClose: () => void;
}

export function ShortageDialog({ itemId, itemName, existing, onClose }: Props) {
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [unitId, setUnitId] = useState<number | null>(existing?.unitId ?? null);
  const [qty, setQty] = useState(existing?.requiredQty ? String(existing.requiredQty) : '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const { busy, run } = useBusy();

  useEffect(() => {
    void loadUnits(itemId).then((u) => {
      setUnits(u);
      // Largest unit (the box) by default — that is how it is ordered.
      setUnitId((cur) => cur ?? u[0]?.id ?? null);
    });
  }, [itemId]);

  async function save() {
    setError(null);
    const n = qty.trim() ? Number(toAsciiDigits(qty)) : null;
    if (n !== null && !(Number.isInteger(n) && n > 0)) return setError(ar.shortages.errors.qty);
    const input = { unitId: n ? unitId : null, requiredQty: n, note: note.trim() || null };
    try {
      if (existing) await window.api!.shortages.update(existing.id, input);
      else await window.api!.shortages.add({ itemId, ...input });
      emitShortagesChanged();
      showToast((existing ? ar.shortages.updated : ar.shortages.added).replace('{item}', itemName));
      onClose();
    } catch (err) {
      if (errorCode(err) === 'shortage.exists') {
        showToast(ar.shortages.exists.replace('{item}', itemName), 'info');
        onClose();
      } else {
        setError(errorText(err));
      }
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onKeyDown={(e) => e.code === 'Escape' && onClose()}>
      <form
        className="modal panel stack"
        onSubmit={(e) => {
          e.preventDefault();
          void run(save);
        }}
      >
        <h2 className="section-heading">{existing ? ar.shortages.editTitle : ar.shortages.addTitle}</h2>
        <p className="strong">{itemName}</p>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.shortages.requiredQty}</span>
            <input
              className="field"
              dir="ltr"
              inputMode="numeric"
              autoFocus
              placeholder={ar.shortages.optional}
              value={qty}
              onChange={(e) => setQty(toAsciiDigits(e.target.value))}
            />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.shortages.unit}</span>
            <select className="field" value={unitId ?? ''} onChange={(e) => setUnitId(Number(e.target.value))}>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.factor > 1 ? `${u.nameAr} (${u.factor})` : u.nameAr}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="formfield">
          <span className="formfield__label">{ar.shortages.note}</span>
          <input className="field" maxLength={300} placeholder={ar.shortages.notePlaceholder} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="btn-row">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {existing ? ar.items.actions.save : ar.shortages.add}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            {ar.common.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Ids of the items on the list now; refreshes whenever the list changes anywhere. */
export function useShortageItems(): Set<number> {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const load = () =>
    void window.api?.shortages
      .activeItems()
      .then((list) => setIds(new Set(list)))
      .catch(() => undefined);
  useEffect(load, []);
  useShortagesChanged(load);
  return ids;
}

/** «نواقص» button: opens the dialog, or shows ✓ when the item is already listed. */
export function ShortageButton({
  itemId,
  itemName,
  listed,
  small = true,
  link = false,
}: {
  itemId: number;
  itemName: string;
  listed: boolean;
  small?: boolean;
  /** Render as a small text link (inside a table cell) instead of a button. */
  link?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={link ? `line-link${listed ? ' line-link--on' : ''}` : `btn ${small ? 'btn--sm' : ''} ${listed ? 'btn--soft' : ''}`}
        title={listed ? ar.shortages.alreadyListed : ar.shortages.addTitle}
        onClick={() => setOpen(true)}
      >
        {listed ? `✓ ${ar.shortages.listedShort}` : `+ ${ar.shortages.short}`}
      </button>
      {open && <ShortageDialog itemId={itemId} itemName={itemName} onClose={() => setOpen(false)} />}
    </>
  );
}
