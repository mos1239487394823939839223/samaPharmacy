/**
 * مرتجع بيع عام — a return with no invoice (the customer lost the receipt).
 * Refunded in cash. With no invoice to bound it, each unit's refund is capped
 * at its share of the box public price (BR-4, decision D9) — the same cap the
 * server enforces. The stock goes back into a batch of the item in this
 * warehouse (the pharmacist may pick which), or to quarantine for fridge /
 * damaged goods.
 *
 * Layout: search (or scan) on top, one card per returned item, and a summary
 * panel at the side with the refund and the confirm button. Keyboard: Enter
 * adds the highlighted item and jumps to its quantity, Enter again returns to
 * the search, F12 confirms.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { ItemListRow } from '@pharmacy/shared';
import { boxFactorOf, fromPiastres, fromPiastresGrouped, lineValue, maxUnitPrice, toAsciiDigits, toBaseUnits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { useToast } from '../../components/Toast';
import { errorText } from '../../lib/errors';
import { SearchInput } from '../../components/SearchInput';
import { PortalAutocomplete } from '../../components/PortalAutocomplete';
import { useBarcodeScanner } from '../../hardware/scanner';
import { loadScannerConfig } from '../../hardware/config';
import { usePageDirty, usePageShortcuts, useRefreshOnActivate } from '../../lib/workspace';

interface UnitOption {
  id: number;
  nameAr: string;
  factor: number;
  salePrice: number;
}

interface DraftLine {
  key: number;
  item: ItemListRow;
  units: UnitOption[];
  unitId: number;
  batchId: number | null;
  batches: Array<{ id: number; qtyOnHand: number; expiryDate: string | null }>;
  qty: string;
  unitPrice: number | null;
  damaged: boolean;
}

let keySeq = 1;

function unitOf(l: DraftLine): UnitOption {
  return l.units.find((u) => u.id === l.unitId) ?? l.units[0]!;
}

/** BR-4 ceiling for the line's unit, or null when the item has no public price. */
function capOf(l: DraftLine): number | null {
  if (l.item.publicPrice == null) return null;
  return maxUnitPrice(l.item.publicPrice, boxFactorOf(l.units), unitOf(l).factor);
}

export function SalesReturnGeneralScreen() {
  const r = ar.salesReturns;
  const g = r.general;
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemListRow[]>([]);
  const [cursor, setCursor] = useState(0);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** The return just saved — offered for printing until the next one. */
  const [last, setLast] = useState<{ id: number; serial: number; total: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef(new Map<number, HTMLInputElement>());
  const focusQty = useRef<number | null>(null);

  /** Cash in the drawer of the open shift: null = no open shift; undefined = loading. */
  const [drawer, setDrawer] = useState<number | null | undefined>(undefined);

  async function loadDrawer() {
    if (!window.api) return;
    try {
      const list = await window.api.warehouses.list();
      const def = list.find((w) => w.isDefault) ?? list[0];
      if (!def) return;
      setWarehouseId(def.id);
      const shift = await window.api.shifts.getOpen(def.id);
      setDrawer(shift ? await window.api.shifts.computeExpectedCash(shift.id) : null);
    } catch {
      /* the summary is informative — the server still enforces the rule */
    }
  }
  useEffect(() => void loadDrawer(), []);
  useRefreshOnActivate(() => void loadDrawer());

  useEffect(() => {
    setCursor(0);
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

  // After adding an item, put the cursor in its quantity.
  useEffect(() => {
    if (focusQty.current == null) return;
    const el = qtyRefs.current.get(focusQty.current);
    focusQty.current = null;
    el?.focus();
    el?.select();
  }, [lines]);

  async function addItem(item: ItemListRow) {
    if (!window.api || !warehouseId) return;
    setError(null);
    setQuery('');
    setResults([]);
    // The same item twice is one more of it, not a second card.
    const existing = lines.find((l) => l.item.id === item.id);
    if (existing) {
      const q = Number(toAsciiDigits(existing.qty)) || 0;
      updateLine(existing.key, { qty: String(q + 1) });
      focusQty.current = existing.key;
      return;
    }
    const [detail, batches] = await Promise.all([window.api.items.get(item.id), window.api.stock.batches(item.id)]);
    const relevant = batches
      .filter((b) => b.warehouseId === warehouseId && !b.isQuarantined)
      .map((b) => ({ id: b.id, qtyOnHand: b.qtyOnHand, expiryDate: b.expiryDate }));
    const units = (detail?.units ?? [])
      .map((u) => ({ id: u.id, nameAr: u.nameAr, factor: u.factor, salePrice: u.salePrice }))
      .sort((a, b) => b.factor - a.factor);
    const unit = detail?.units.find((u) => u.isDefaultSale && u.allowSale) ?? units[0];
    if (!unit) return setError(ar.sales.errors.noSellableUnit.replace('{item}', item.nameAr));

    const key = keySeq++;
    focusQty.current = key;
    setLast(null);
    setLines((prev) => [
      ...prev,
      {
        key,
        item,
        units,
        unitId: unit.id,
        batchId: relevant[0]?.id ?? null,
        batches: relevant,
        qty: '1',
        unitPrice: unit.salePrice,
        damaged: false,
      },
    ]);
  }

  // Scanning a box adds it (rule: no mouse needed).
  useBarcodeScanner(
    async (event) => {
      if (!window.api) return;
      const item = await window.api.items.findByBarcode(event.code);
      if (item) await addItem(item);
      else setError(ar.sales.errors.barcodeNotFound.replace('{code}', event.code));
    },
    { config: loadScannerConfig(), shouldIgnore: () => (document.activeElement as HTMLElement | null)?.tagName === 'SELECT' }
  );

  function updateLine(key: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function lineTotal(l: DraftLine): number {
    const qty = Number(toAsciiDigits(l.qty));
    return Number.isFinite(qty) && qty > 0 ? lineValue(qty, l.unitPrice ?? 0) : 0;
  }

  const total = lines.reduce((s, l) => s + lineTotal(l), 0);
  const damagedCount = lines.filter((l) => l.damaged).length;

  function onSearchKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.code === 'ArrowDown' && results.length) {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, results.length - 1));
    } else if (e.code === 'ArrowUp' && results.length) {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      const pick = results[Math.min(cursor, results.length - 1)];
      if (pick) void addItem(pick);
    } else if (e.code === 'Escape') {
      setQuery('');
    }
  }

  function backToSearch(e: KeyboardEvent<HTMLInputElement>) {
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      searchRef.current?.focus();
    }
  }

  async function submit() {
    if (!window.api || !warehouseId || saving) return;
    setError(null);
    if (lines.length === 0) return setError(r.errors.noLines);

    for (const l of lines) {
      const qty = Number(toAsciiDigits(l.qty));
      if (!(qty > 0)) return setError(ar.errors['return.qtyInvalid']);
      try {
        toBaseUnits(qty, unitOf(l).factor);
      } catch {
        return setError(ar.errors['return.qtyNotWhole'].replace('{qty}', l.qty).replace('{unit}', unitOf(l).nameAr));
      }
      if (l.batches.length === 0) return setError(ar.errors['return.noBatch'].replace('{item}', l.item.nameAr));
      const cap = capOf(l);
      if (l.unitPrice == null) return setError(r.errors.priceRequired.replace('{item}', l.item.nameAr));
      if (cap != null && l.unitPrice > cap) {
        return setError(ar.errors['return.priceAbovePublic'].replace('{cap}', `${fromPiastres(cap)} ${ar.common.currency}`));
      }
    }

    setSaving(true);
    try {
      const input = {
        warehouseId,
        refundMethod: 'cash' as const,
        reason: reason.trim() || null,
        lines: lines.map((l) => ({
          itemId: l.item.id,
          batchId: l.batchId,
          unitId: l.unitId,
          qtyInUnit: Number(toAsciiDigits(l.qty)),
          unitPrice: l.unitPrice!,
          damaged: l.damaged,
        })),
      };
      const returnId = await window.api.salesReturns.create(input);
      const created = await window.api.salesReturns.get(returnId);
      const serial = created?.serial ?? returnId;
      setLast({ id: returnId, serial, total });
      showToast(r.confirmed.replace('{serial}', String(serial)));
      setLines([]);
      setReason('');
      void loadDrawer();
      searchRef.current?.focus();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const actions = useRef({ submit });
  actions.current = { submit };
  usePageShortcuts(() => [{ id: 'confirmReturn', code: 'F12', run: () => void actions.current.submit() }], []);
  usePageDirty(lines.length > 0);

  const printLast = () => {
    if (last) void window.api!.print.document('salesReturn', last.id).catch((err) => setError(errorText(err)));
  };

  return (
    <div className="gret">
      <div className="gret__main">
        <div className="gret__search field-wrap">
          <SearchInput
            ref={searchRef}
            className="field gret__search-input"
            placeholder={g.searchPlaceholder}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
          />
          <PortalAutocomplete
            anchorRef={searchRef}
            items={results}
            getKey={(it) => it.id}
            activeIndex={Math.min(cursor, results.length - 1)}
            onSelect={(it) => void addItem(it)}
          >
            {(it) => (
              <span className="gret__result">
                <span>{it.nameAr}</span>
                {it.publicPrice != null && (
                  <span className="muted small" dir="ltr">
                    {fromPiastresGrouped(it.publicPrice)}
                  </span>
                )}
              </span>
            )}
          </PortalAutocomplete>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        {last && lines.length === 0 && (
          <div className="gret__done">
            <span>
              {g.savedLine.replace('{serial}', String(last.serial)).replace('{total}', fromPiastresGrouped(last.total))}
            </span>
            <button type="button" className="btn btn--sm" onClick={printLast}>
              {ar.print.lastReturn}
            </button>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="gret__empty">
            <div className="gret__empty-title">{g.emptyTitle}</div>
            <ol className="gret__steps">
              <li>{g.step1}</li>
              <li>{g.step2}</li>
              <li>{g.step3}</li>
            </ol>
          </div>
        ) : (
          <section className="plines" style={{ marginBlock: 0, paddingBlockStart: 0, borderBlockStart: 0 }}>
            {lines.map((l, i) => {
              const cap = capOf(l);
              const over = cap != null && (l.unitPrice ?? 0) > cap;
              const u = unitOf(l);
              return (
                <div key={l.key} className={l.damaged ? 'pline gret__line--damaged' : 'pline'}>
                  <div className="pline__top">
                    <span className="pline__no">{i + 1}</span>
                    <div className="pline__item gret__name">
                      <span className="strong">{l.item.nameAr}</span>
                      {l.item.nameEn && (
                        <span className="muted small" dir="ltr">
                          {l.item.nameEn}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="pline__remove"
                      onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                      aria-label={ar.purchases.grid.remove}
                      title={ar.purchases.grid.remove}
                    >
                      ×
                    </button>
                  </div>
                  <div className="pline__fields">
                    <label className="formfield">
                      <span className="formfield__label">{r.unit}</span>
                      <select
                        className="field"
                        value={l.unitId}
                        onChange={(e) => {
                          const unit = l.units.find((x) => x.id === Number(e.target.value));
                          if (unit) updateLine(l.key, { unitId: unit.id, unitPrice: unit.salePrice });
                        }}
                      >
                        {l.units.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.factor > 1 ? `${x.nameAr} (${x.factor})` : x.nameAr}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="formfield">
                      <span className="formfield__label">
                        {r.returnQty}
                        <span className="req"> *</span>
                      </span>
                      <input
                        ref={(el) => {
                          if (el) qtyRefs.current.set(l.key, el);
                          else qtyRefs.current.delete(l.key);
                        }}
                        className="field"
                        dir="ltr"
                        inputMode="decimal"
                        data-enter="own"
                        value={l.qty}
                        onChange={(e) => updateLine(l.key, { qty: toAsciiDigits(e.target.value) })}
                        onKeyDown={backToSearch}
                      />
                    </label>
                    <label className="formfield">
                      <span className="formfield__label">{g.unitPrice}</span>
                      <MoneyInput value={l.unitPrice} onChange={(v) => updateLine(l.key, { unitPrice: v })} />
                    </label>
                    <label className="formfield gret__batch">
                      <span className="formfield__label">{g.batch}</span>
                      {l.batches.length === 0 ? (
                        <span className="text-bad small">{r.noBatch}</span>
                      ) : (
                        <select className="field" value={l.batchId ?? ''} onChange={(e) => updateLine(l.key, { batchId: Number(e.target.value) })}>
                          {l.batches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {g.batchOption.replace('{expiry}', b.expiryDate ?? '—').replace('{qty}', String(b.qtyOnHand))}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                  </div>
                  <div className="pline__foot">
                    <label className="gret__damaged">
                      <input type="checkbox" checked={l.damaged} onChange={(e) => updateLine(l.key, { damaged: e.target.checked })} />
                      {g.damaged}
                    </label>
                    {over ? (
                      <span className="text-bad">{g.overCap.replace('{cap}', fromPiastresGrouped(cap!)).replace('{unit}', u.nameAr)}</span>
                    ) : (
                      cap != null && <span>{g.capHint.replace('{cap}', fromPiastresGrouped(cap)).replace('{unit}', u.nameAr)}</span>
                    )}
                    <span className="pline__total">
                      {r.refund}: <b dir="ltr">{fromPiastresGrouped(lineTotal(l))}</b>
                    </span>
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>

      <aside className="gret__side panel">
        <div className="gret__total">
          <span className="gret__total-label">{r.refundTotal}</span>
          <span className="gret__total-value" dir="ltr">
            {fromPiastresGrouped(total)} <small>{ar.common.currency}</small>
          </span>
        </div>
        <dl className="gret__facts">
          <div>
            <dt>{g.itemsCount}</dt>
            <dd>{lines.length}</dd>
          </div>
          <div>
            <dt>{r.refundMethod}</dt>
            <dd>{g.cashFromDrawer}</dd>
          </div>
          {drawer != null && (
            <div>
              <dt>{g.drawerCash}</dt>
              <dd dir="ltr">{fromPiastresGrouped(drawer)}</dd>
            </div>
          )}
          {damagedCount > 0 && (
            <div>
              <dt>{g.damagedCount}</dt>
              <dd>{damagedCount}</dd>
            </div>
          )}
        </dl>
        {drawer === null && <div className="gret__warn" role="status">{g.noShift}</div>}
        {drawer != null && total > drawer && <div className="gret__warn" role="status">{g.drawerShort}</div>}
        <label className="formfield">
          <span className="formfield__label">{r.reason}</span>
          <input className="field" value={reason} placeholder={g.reasonPlaceholder} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </label>
        <button type="button" className="btn btn--primary gret__confirm" onClick={() => void submit()} disabled={saving || lines.length === 0}>
          {r.confirm}
          <span className="gret__key" dir="ltr">F12</span>
        </button>
        <p className="gret__note">{r.priceCapNotice}</p>
      </aside>
    </div>
  );
}
