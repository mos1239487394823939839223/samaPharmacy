/**
 * رصيد أول المدة — enter the medicines already on the shelves when the
 * pharmacy starts using the system. Scan or search the item, type the
 * quantity and expiry, Enter → next line. The cost is filled from the
 * selling price minus خصم الصيدلي (settings, default 20%); it can be typed
 * over. Saving adds the stock (no supplier, no invoice) as one adjustment.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ItemListRow, WarehouseRow } from '@pharmacy/shared';
import { fromPiastresGrouped, parseExpiry, toAsciiDigits, toBaseUnits, todayLocal } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { ExpiryInput } from '../../components/ExpiryInput';
import { PortalAutocomplete } from '../../components/PortalAutocomplete';
import { QuickItemDialog } from '../../components/QuickItemDialog';
import { useToast } from '../../components/Toast';
import { errorText } from '../../lib/errors';
import { useBusy } from '../../lib/useBusy';
import { usePageDirty } from '../../lib/workspace';
import { useBarcodeScanner } from '../../hardware/scanner';
import { loadScannerConfig } from '../../hardware/config';

const t = ar.opening;

interface Unit {
  id: number;
  nameAr: string;
  factor: number;
  salePrice: number;
}

interface Line {
  key: number;
  query: string;
  results: ItemListRow[];
  item: ItemListRow | null;
  noExpiry: boolean;
  units: Unit[];
  unitId: number | null;
  qty: string;
  expiry: string;
  batch: string;
  /** Piastres per chosen unit. */
  cost: number | null;
  autoCost: boolean;
}

type Field = 'item' | 'qty' | 'expiry' | 'cost';
let seq = 1;
const blank = (): Line => ({
  key: seq++, query: '', results: [], item: null, noExpiry: false, units: [], unitId: null,
  qty: '', expiry: '', batch: '', cost: null, autoCost: true,
});

const costFrom = (sale: number, pct: number) => (sale > 0 ? Math.round((sale * (100 - pct)) / 100) : null);

export function OpeningStockScreen() {
  const [lines, setLines] = useState<Line[]>([blank()]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [pct, setPct] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<{ key: number; text: string } | null>(null);
  const [suggest, setSuggest] = useState(0);
  const [focusReq, setFocusReq] = useState<{ key: number; field: Field } | null>(null);
  const { showToast } = useToast();
  const { busy, run } = useBusy();
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const searchSeq = useRef(new Map<number, number>());
  const pendingSearch = useRef(new Map<number, Promise<ItemListRow[]>>());
  const [quickAdd, setQuickAdd] = useState<{ key: number; name: string; barcode?: string } | null>(null);
  const inputRefs = useRef(new Map<number, React.RefObject<HTMLInputElement>>());
  const refFor = (key: number) => {
    let r = inputRefs.current.get(key);
    if (!r) inputRefs.current.set(key, (r = { current: null }));
    return r;
  };

  useEffect(() => {
    void window.api!.warehouses.list().then((w) => {
      setWarehouses(w);
      setWarehouseId((w.find((x) => x.isDefault) ?? w[0])?.id ?? null);
    });
    void window.api!.settings.get().then((s) => setPct(s.purchaseDiscountPct));
  }, []);

  useEffect(() => {
    if (!focusReq) return;
    const el = document.querySelector<HTMLElement>(`[data-line="${focusReq.key}"] [data-field="${focusReq.field}"]`);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setFocusReq(null);
    }
  }, [focusReq, lines]);

  const filled = lines.filter((l) => l.item);
  usePageDirty(filled.length > 0);

  const patch = (key: number, p: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));

  function search(key: number, q: string) {
    patch(key, { query: q, item: null, results: [] });
    setSuggest(0);
    // Only the latest keystroke's results may land (see PurchaseForm).
    const seq = (searchSeq.current.get(key) ?? 0) + 1;
    searchSeq.current.set(key, seq);
    pendingSearch.current.delete(key);
    if (!q.trim()) return;
    const p = window.api!.items.search(q, 10).then((results) => {
      if (searchSeq.current.get(key) === seq) patch(key, { results });
      return results;
    });
    pendingSearch.current.set(key, p);
  }

  async function pick(key: number, item: ItemListRow) {
    searchSeq.current.set(key, (searchSeq.current.get(key) ?? 0) + 1);
    pendingSearch.current.delete(key);
    // The same item twice → go to its existing line instead.
    const dup = linesRef.current.find((l) => l.item?.id === item.id && l.key !== key);
    if (dup) {
      patch(key, { query: '', results: [] });
      setHint({ key: dup.key, text: t.duplicate });
      return setFocusReq({ key: dup.key, field: 'qty' });
    }
    patch(key, { item, query: item.nameAr, results: [] });
    setHint(null);
    setFocusReq({ key, field: 'qty' });
    const d = await window.api!.items.get(item.id);
    const units: Unit[] = (d?.units ?? [])
      .filter((u) => u.allowSale)
      .map((u) => ({ id: u.id, nameAr: u.nameAr, factor: u.factor, salePrice: u.salePrice }))
      .sort((a, b) => b.factor - a.factor);
    const unit = units[0]; // the box: shelves are counted in boxes
    patch(key, { units, unitId: unit?.id ?? null, noExpiry: Boolean(d?.noExpiry), cost: unit ? costFrom(unit.salePrice, pct) : null, autoCost: true });
  }

  useBarcodeScanner(
    async (ev) => {
      const item = await window.api!.items.findByBarcode(ev.code);
      if (!item) {
        // An unknown box: add it as a new item on the spot.
        const target = linesRef.current.find((l) => !l.item);
        const key = target?.key ?? lines[lines.length - 1]!.key;
        return setQuickAdd({ key, name: '', barcode: ev.code });
      }
      const target = linesRef.current.find((l) => !l.item);
      if (target) return void pick(target.key, item);
      const fresh = blank();
      setLines((prev) => [...prev, fresh]);
      setTimeout(() => void pick(fresh.key, item), 0);
    },
    { config: loadScannerConfig(), shouldIgnore: () => (document.activeElement as HTMLElement | null)?.tagName === 'SELECT' }
  );

  const unitOf = (l: Line) => l.units.find((u) => u.id === l.unitId);
  const baseQty = (l: Line): number | null => {
    const u = unitOf(l);
    const n = Number(toAsciiDigits(l.qty));
    if (!u || !(n > 0)) return null;
    try {
      return toBaseUnits(n, u.factor);
    } catch {
      return null;
    }
  };

  function missing(l: Line): { field: Field; text: string } | null {
    if (!l.item) return { field: 'item', text: t.needItem };
    if (baseQty(l) === null) return { field: 'qty', text: t.needQty };
    if (!l.noExpiry && (!l.expiry || l.expiry <= todayLocal())) return { field: 'expiry', text: t.needExpiry };
    if (l.cost == null) return { field: 'cost', text: t.needCost };
    return null;
  }

  function next(fromKey: number) {
    const idx = linesRef.current.findIndex((l) => l.key === fromKey);
    const empty = linesRef.current.slice(idx + 1).find((l) => !l.item);
    if (empty) return setFocusReq({ key: empty.key, field: 'item' });
    const fresh = blank();
    setLines((prev) => [...prev, fresh]);
    setFocusReq({ key: fresh.key, field: 'item' });
  }

  function onLineKey(e: React.KeyboardEvent, line: Line) {
    if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
    const target = e.target as HTMLElement;
    if (target.dataset.field === 'item') return;
    e.preventDefault();
    let cur = linesRef.current.find((l) => l.key === line.key) ?? line;
    if (target.dataset.field === 'expiry' && target instanceof HTMLInputElement) {
      const iso = parseExpiry(target.value) ?? '';
      if (iso !== cur.expiry) {
        cur = { ...cur, expiry: iso };
        patch(line.key, { expiry: iso });
      }
    }
    const m = missing(cur);
    if (m) {
      setHint({ key: line.key, text: m.text });
      return setFocusReq({ key: line.key, field: m.field });
    }
    setHint(null);
    next(line.key);
  }

  function onItemKey(e: React.KeyboardEvent<HTMLInputElement>, line: Line) {
    const n = line.results.length;
    if (e.code === 'ArrowDown' && n) {
      e.preventDefault();
      setSuggest((i) => (i + 1) % n);
    } else if (e.code === 'ArrowUp' && n) {
      e.preventDefault();
      setSuggest((i) => (i - 1 + n) % n);
    } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      const p = line.results[Math.min(suggest, n - 1)];
      if (p) void pick(line.key, p);
      else if (line.item) setFocusReq({ key: line.key, field: 'qty' });
      else if (line.query.trim()) {
        // Enter before the results came back: wait and take the first.
        const pending = pendingSearch.current.get(line.key);
        const seq = searchSeq.current.get(line.key);
        const name = line.query;
        if (!pending) return setQuickAdd({ key: line.key, name });
        void pending.then((results) => {
          if (searchSeq.current.get(line.key) !== seq) return;
          if (results[0]) void pick(line.key, results[0]);
          else setQuickAdd({ key: line.key, name });
        });
      }
    }
  }

  const totals = useMemo(() => {
    let cost = 0;
    let sale = 0;
    for (const l of filled) {
      const u = unitOf(l);
      const q = Number(toAsciiDigits(l.qty));
      if (!u || !(q > 0)) continue;
      cost += Math.round(q * (l.cost ?? 0));
      sale += Math.round(q * u.salePrice);
    }
    return { cost, sale };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  async function save() {
    setError(null);
    if (!warehouseId) return;
    if (filled.length === 0) return setError(t.nothing);
    for (const l of filled) {
      const m = missing(l);
      if (m) {
        setHint({ key: l.key, text: m.text });
        setFocusReq({ key: l.key, field: m.field });
        return setError(`${l.item!.nameAr}: ${m.text}`);
      }
    }
    if (!window.confirm(t.confirm.replace('{n}', String(filled.length)).replace('{cost}', fromPiastresGrouped(totals.cost)))) return;
    try {
      await window.api!.valuation.opening({
        warehouseId,
        lines: filled.map((l) => ({
          itemId: l.item!.id,
          unitId: l.unitId!,
          qtyInUnit: Number(toAsciiDigits(l.qty)),
          expiryDate: l.noExpiry ? null : l.expiry,
          batchNumber: l.batch.trim() || null,
          unitCost: l.cost,
        })),
      });
      showToast(t.saved.replace('{n}', String(filled.length)));
      setLines([blank()]);
      setHint(null);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="stack">
      {warehouses.length > 1 && (
        <label className="formfield formfield--narrow">
          <span className="formfield__label">{ar.purchases.warehouse}</span>
          <select className="field" value={warehouseId ?? ''} onChange={(e) => setWarehouseId(Number(e.target.value))}>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.nameAr}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && <div className="alert alert--error">{error}</div>}

      <section className="plines" style={{ marginBlock: 0 }}>
        {lines.map((line, i) => {
          const u = unitOf(line);
          const q = Number(toAsciiDigits(line.qty));
          return (
            <div key={line.key} data-line={line.key} className={line.item ? 'pline' : 'pline pline--empty'} onKeyDown={(e) => onLineKey(e, line)}>
              <div className="pline__top">
                <span className="pline__no">{i + 1}</span>
                <div className="pline__item">
                  <input
                    ref={refFor(line.key)}
                    className="field"
                    data-field="item"
                    placeholder={ar.purchases.lines.itemPlaceholder}
                    value={line.query}
                    onChange={(e) => search(line.key, e.target.value)}
                    onKeyDown={(e) => onItemKey(e, line)}
                  />
                  <PortalAutocomplete
                    anchorRef={refFor(line.key)}
                    items={line.results}
                    getKey={(r) => r.id}
                    activeIndex={Math.min(suggest, line.results.length - 1)}
                    footer={
                      line.query.trim() && !line.item
                        ? { label: ar.quickItem.openNamed.replace('{name}', line.query.trim()), onClick: () => setQuickAdd({ key: line.key, name: line.query }) }
                        : null
                    }
                    onSelect={(r) => void pick(line.key, r)}
                  >
                    {(r) => <span>{r.nameAr}</span>}
                  </PortalAutocomplete>
                </div>
                <button
                  type="button"
                  className="pline__remove"
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                  aria-label={ar.purchases.grid.remove}
                >
                  ×
                </button>
              </div>
              <div className="pline__fields">
                <label className="formfield">
                  <span className="formfield__label">{ar.purchases.grid.unit}</span>
                  <select
                    className="field"
                    value={line.unitId ?? ''}
                    disabled={line.units.length === 0}
                    onChange={(e) => {
                      const nu = line.units.find((x) => x.id === Number(e.target.value));
                      if (nu) patch(line.key, { unitId: nu.id, ...(line.autoCost ? { cost: costFrom(nu.salePrice, pct) } : {}) });
                    }}
                  >
                    {line.units.length === 0 && <option value="">—</option>}
                    {line.units.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.factor > 1 ? `${x.nameAr} (${x.factor})` : x.nameAr}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="formfield">
                  <span className="formfield__label">
                    {ar.purchases.grid.qty}
                    <span className="req"> *</span>
                  </span>
                  <input className="field" dir="ltr" inputMode="decimal" data-field="qty" value={line.qty} onChange={(e) => patch(line.key, { qty: toAsciiDigits(e.target.value) })} />
                </label>
                <label className="formfield">
                  <span className="formfield__label">
                    {ar.purchases.grid.expiryDate}
                    {!line.noExpiry && <span className="req"> *</span>}
                  </span>
                  <ExpiryInput
                    field="expiry"
                    disabled={line.noExpiry}
                    value={line.noExpiry ? '' : line.expiry}
                    onChange={(iso) => patch(line.key, { expiry: iso })}
                  />
                </label>
                <label className="formfield">
                  <span className="formfield__label">{ar.purchases.grid.batchNumber}</span>
                  <input className="field" dir="ltr" value={line.batch} onChange={(e) => patch(line.key, { batch: e.target.value })} />
                </label>
                <label className="formfield">
                  <span className="formfield__label">{t.cost}</span>
                  <MoneyInput field="cost" value={line.cost} onChange={(v) => patch(line.key, { cost: v, autoCost: false })} />
                  {line.autoCost && line.cost != null && <span className="hint">{ar.purchases.lines.autoPrice.replace('{pct}', String(pct))}</span>}
                </label>
              </div>
              {hint?.key === line.key && <div className="pline__hint">{hint.text}</div>}
              {line.item && u && q > 0 && (
                <div className="pline__foot">
                  <span>
                    {t.sale}: <b dir="ltr">{fromPiastresGrouped(Math.round(q * u.salePrice))}</b>
                  </span>
                  <span className="pline__total">
                    {t.lineCost}: <b dir="ltr">{fromPiastresGrouped(Math.round(q * (line.cost ?? 0)))}</b>
                  </span>
                </div>
              )}
            </div>
          );
        })}
        <div className="plines__actions">
          <button type="button" className="btn plines__add" onClick={() => next(lines[lines.length - 1]!.key)}>
            + {ar.purchases.lines.add.replace(' (F12)', '')}
          </button>
          <span className="muted small">{ar.purchases.lines.enterTip}</span>
        </div>
      </section>

      <div className="psummary">
        <div>
          <span>{t.items}</span>
          <b dir="ltr">{filled.length}</b>
        </div>
        <div>
          <span>{t.sale}</span>
          <b dir="ltr">{fromPiastresGrouped(totals.sale)}</b>
        </div>
        <div className="psummary__total">
          <span>{t.totalCost}</span>
          <b dir="ltr">{fromPiastresGrouped(totals.cost)}</b>
        </div>
      </div>
      <div className="btn-row">
        <button type="button" className="btn btn--primary" disabled={busy || filled.length === 0} onClick={() => void run(save)}>
          {t.save}
        </button>
      </div>
      {quickAdd && (
        <QuickItemDialog
          initialName={quickAdd.name}
          initialBarcode={quickAdd.barcode}
          onClose={() => {
            const key = quickAdd.key;
            setQuickAdd(null);
            setFocusReq({ key, field: 'item' });
          }}
          onCreated={(item) => {
            const key = quickAdd.key;
            setQuickAdd(null);
            showToast(ar.quickItem.created.replace('{name}', item.nameAr));
            void pick(key, item);
          }}
        />
      )}
    </div>
  );
}
