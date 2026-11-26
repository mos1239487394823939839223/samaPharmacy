/**
 * مرتجعات شراء عام — a return with no source purchase invoice: stock going
 * back to a supplier for reasons unrelated to any specific receipt (recall,
 * negotiated bulk return, etc).
 *
 * Same layout as the general sales return: supplier and item search on top,
 * one card per item, a summary panel at the side. Enter adds the highlighted
 * item and jumps to its quantity; Enter again returns to the search; F12
 * confirms.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { ItemListRow, SupplierRow } from '@pharmacy/shared';
import { fromPiastresGrouped, toAsciiDigits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { useToast } from '../../components/Toast';
import { errorText } from '../../lib/errors';
import { baseQty, describeQty, type UnitOption } from '../../lib/units';
import { SearchInput } from '../../components/SearchInput';
import { PortalAutocomplete } from '../../components/PortalAutocomplete';
import { useBarcodeScanner } from '../../hardware/scanner';
import { loadScannerConfig } from '../../hardware/config';
import { usePageDirty, usePageShortcuts } from '../../lib/workspace';

interface DraftLine {
  key: number;
  item: ItemListRow;
  units: UnitOption[];
  unitId: number | null;
  batchId: number | null;
  batches: Array<{ id: number; qtyOnHand: number; batchNumber: string | null; expiryDate: string | null; unitCost: number }>;
  qty: string;
}

let keySeq = 1;

const unitOfLine = (l: DraftLine) => l.units.find((u) => u.id === l.unitId);

export function PurchaseReturnGeneralScreen() {
  const r = ar.purchaseReturns;
  const g = r.general;
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierResults, setSupplierResults] = useState<SupplierRow[]>([]);
  const [supplierCursor, setSupplierCursor] = useState(0);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [itemQuery, setItemQuery] = useState('');
  const [itemResults, setItemResults] = useState<ItemListRow[]>([]);
  const [itemCursor, setItemCursor] = useState(0);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** The return just saved — offered for printing until the next one. */
  const [last, setLast] = useState<{ id: number; serial: number; total: number; supplier: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();
  const supplierRef = useRef<HTMLInputElement>(null);
  const itemRef = useRef<HTMLInputElement>(null);
  const qtyRefs = useRef(new Map<number, HTMLInputElement>());
  const focusQty = useRef<number | null>(null);
  const supplierDebounce = useRef<ReturnType<typeof setTimeout>>();
  const itemDebounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      const def = list.find((w) => w.isDefault) ?? list[0];
      if (def) setWarehouseId(def.id);
    });
  }, []);

  useEffect(() => {
    setSupplierCursor(0);
    if (!window.api || !supplierQuery.trim() || supplier) {
      setSupplierResults([]);
      return;
    }
    if (supplierDebounce.current) clearTimeout(supplierDebounce.current);
    supplierDebounce.current = setTimeout(() => {
      void window.api!.suppliers.search(supplierQuery, 10).then(setSupplierResults);
    }, 120);
    return () => {
      if (supplierDebounce.current) clearTimeout(supplierDebounce.current);
    };
  }, [supplierQuery, supplier]);

  useEffect(() => {
    setItemCursor(0);
    if (!window.api || !itemQuery.trim()) {
      setItemResults([]);
      return;
    }
    if (itemDebounce.current) clearTimeout(itemDebounce.current);
    itemDebounce.current = setTimeout(() => {
      void window.api!.items.search(itemQuery, 10).then(setItemResults);
    }, 120);
    return () => {
      if (itemDebounce.current) clearTimeout(itemDebounce.current);
    };
  }, [itemQuery]);

  useEffect(() => {
    if (focusQty.current == null) return;
    const el = qtyRefs.current.get(focusQty.current);
    focusQty.current = null;
    el?.focus();
    el?.select();
  }, [lines]);

  function selectSupplier(s: SupplierRow) {
    setSupplier(s);
    setSupplierQuery(s.nameAr);
    setSupplierResults([]);
    setError(null);
    itemRef.current?.focus();
  }

  async function addItem(item: ItemListRow) {
    if (!window.api || !warehouseId) return;
    setError(null);
    setItemQuery('');
    setItemResults([]);
    const existing = lines.find((l) => l.item.id === item.id);
    if (existing) {
      focusQty.current = existing.key;
      setLines((prev) => [...prev]);
      return;
    }
    const [detail, batches] = await Promise.all([window.api.items.get(item.id), window.api.stock.batches(item.id)]);
    const withStock = batches
      .filter((b) => b.warehouseId === warehouseId && b.qtyOnHand > 0 && !b.isQuarantined)
      .map((b) => ({ id: b.id, qtyOnHand: b.qtyOnHand, batchNumber: b.batchNumber, expiryDate: b.expiryDate, unitCost: b.unitCost }));

    // unit_id is a real foreign key to item_units (docs/schema.sql) — every
    // item has its own rows there, so it is resolved per item.
    const units = (detail?.units ?? [])
      .map((u) => ({ id: u.id, nameAr: u.nameAr, factor: u.factor }))
      .sort((a, b) => b.factor - a.factor);
    const unit = detail?.units.find((u) => u.isDefaultSale) ?? units[0];

    const key = keySeq++;
    focusQty.current = key;
    setLast(null);
    setLines((prev) => [
      ...prev,
      { key, item, units, unitId: unit?.id ?? null, batchId: withStock[0]?.id ?? null, batches: withStock, qty: '1' },
    ]);
  }

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

  function listKeys<T>(e: KeyboardEvent<HTMLInputElement>, list: T[], cursor: number, setCursor: (n: number) => void, pick: (t: T) => void) {
    if (e.code === 'ArrowDown' && list.length) {
      e.preventDefault();
      setCursor(Math.min(cursor + 1, list.length - 1));
    } else if (e.code === 'ArrowUp' && list.length) {
      e.preventDefault();
      setCursor(Math.max(cursor - 1, 0));
    } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      const t = list[Math.min(cursor, list.length - 1)];
      if (t) pick(t);
    }
  }

  const lineCost = (l: DraftLine) => {
    const batch = l.batches.find((b) => b.id === l.batchId);
    return (baseQty(l.qty, unitOfLine(l)) ?? 0) * (batch?.unitCost ?? 0);
  };
  const totalCost = lines.reduce((s, l) => s + lineCost(l), 0);

  async function submit() {
    if (!window.api || !warehouseId || saving) return;
    setError(null);
    if (!supplier) {
      supplierRef.current?.focus();
      return setError(r.errors.noSupplier);
    }

    const valid = lines.filter((l) => l.batchId && l.unitId && baseQty(l.qty, unitOfLine(l)) !== 0);
    if (valid.length === 0) return setError(r.errors.noLines);
    if (valid.some((l) => baseQty(l.qty, unitOfLine(l)) === null)) return setError(r.errors.qtyNotWhole);

    // The real bound is what is still on the shelf in the batch (the server checks it too).
    const overQty = valid.find((l) => {
      const batch = l.batches.find((b) => b.id === l.batchId);
      return (baseQty(l.qty, unitOfLine(l)) ?? 0) > (batch?.qtyOnHand ?? 0);
    });
    if (overQty) return setError(r.errors.qtyExceedsOnHand);

    setSaving(true);
    try {
      const returnId = await window.api.purchaseReturns.create({
        supplierId: supplier.id,
        warehouseId,
        reason: reason.trim() || null,
        lines: valid.map((l) => ({
          itemId: l.item.id,
          batchId: l.batchId!,
          unitId: l.unitId!,
          qtyInUnit: Number(toAsciiDigits(l.qty)),
        })),
      });
      const created = await window.api.purchaseReturns.get(returnId);
      const serial = created?.serial ?? returnId;
      setLast({ id: returnId, serial, total: totalCost, supplier: supplier.nameAr });
      showToast(r.confirmed.replace('{serial}', String(serial)));
      setLines([]);
      setReason('');
      itemRef.current?.focus();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const actions = useRef({ submit });
  actions.current = { submit };
  usePageShortcuts(() => [{ id: 'confirmPurchaseReturn', code: 'F12', run: () => void actions.current.submit() }], []);
  usePageDirty(lines.length > 0);

  return (
    <div className="gret">
      <div className="gret__main">
        <div className="gret__pick">
          <label className="formfield">
            <span className="formfield__label">
              {r.supplier}
              <span className="req"> *</span>
            </span>
            <SearchInput
              ref={supplierRef}
              className={supplier ? 'field gret__picked' : 'field'}
              placeholder={g.supplierPlaceholder}
              autoFocus
              value={supplierQuery}
              data-enter="own"
              onChange={(e) => {
                setSupplierQuery(e.target.value);
                setSupplier(null);
              }}
              onKeyDown={(e) => listKeys(e, supplierResults, supplierCursor, setSupplierCursor, selectSupplier)}
            />
            <PortalAutocomplete
              anchorRef={supplierRef}
              items={supplierResults}
              getKey={(s) => s.id}
              activeIndex={Math.min(supplierCursor, supplierResults.length - 1)}
              onSelect={selectSupplier}
            >
              {(s) => <span>{s.nameAr}</span>}
            </PortalAutocomplete>
          </label>
          <label className="formfield">
            <span className="formfield__label">{g.itemLabel}</span>
            <SearchInput
              ref={itemRef}
              className="field"
              placeholder={g.itemPlaceholder}
              value={itemQuery}
              onChange={(e) => setItemQuery(e.target.value)}
              onKeyDown={(e) => listKeys(e, itemResults, itemCursor, setItemCursor, (it) => void addItem(it))}
            />
            <PortalAutocomplete
              anchorRef={itemRef}
              items={itemResults}
              getKey={(it) => it.id}
              activeIndex={Math.min(itemCursor, itemResults.length - 1)}
              onSelect={(it) => void addItem(it)}
            >
              {(it) => <span>{it.nameAr}</span>}
            </PortalAutocomplete>
          </label>
        </div>

        {error && <div className="alert alert--error">{error}</div>}

        {last && lines.length === 0 && (
          <div className="gret__done">
            <span>
              {g.savedLine
                .replace('{serial}', String(last.serial))
                .replace('{supplier}', last.supplier)
                .replace('{total}', fromPiastresGrouped(last.total))}
            </span>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => void window.api!.print.document('purchaseReturn', last.id).catch((err) => setError(errorText(err)))}
            >
              {ar.print.lastReturn}
            </button>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="gret__empty">
            <div className="gret__empty-title">{ar.salesReturns.general.emptyTitle}</div>
            <ol className="gret__steps">
              <li>{g.step1}</li>
              <li>{g.step2}</li>
              <li>{g.step3}</li>
            </ol>
          </div>
        ) : (
          <section className="plines" style={{ marginBlock: 0, paddingBlockStart: 0, borderBlockStart: 0 }}>
            {lines.map((l, i) => {
              const batch = l.batches.find((b) => b.id === l.batchId);
              const base = baseQty(l.qty, unitOfLine(l));
              const over = base != null && batch != null && base > batch.qtyOnHand;
              return (
                <div key={l.key} className="pline">
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
                    <label className="formfield gret__batch">
                      <span className="formfield__label">{r.batch}</span>
                      {l.batches.length === 0 ? (
                        <span className="text-bad small">{g.noStock}</span>
                      ) : (
                        <select className="field" value={l.batchId ?? ''} onChange={(e) => updateLine(l.key, { batchId: Number(e.target.value) })}>
                          {l.batches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {g.batchOption
                                .replace('{expiry}', b.expiryDate ?? '—')
                                .replace('{batch}', b.batchNumber ?? '—')
                                .replace('{qty}', describeQty(b.qtyOnHand, l.units))}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                    <label className="formfield">
                      <span className="formfield__label">{r.unit}</span>
                      <select className="field" value={l.unitId ?? ''} onChange={(e) => updateLine(l.key, { unitId: Number(e.target.value) })}>
                        {l.units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.factor > 1 ? `${u.nameAr} (${u.factor})` : u.nameAr}
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
                        onKeyDown={(e) => {
                          if (e.code === 'Enter' || e.code === 'NumpadEnter') {
                            e.preventDefault();
                            itemRef.current?.focus();
                          }
                        }}
                      />
                    </label>
                  </div>
                  <div className="pline__foot">
                    {over ? (
                      <span className="text-bad">{r.errors.qtyExceedsOnHand}</span>
                    ) : (
                      <span>
                        {r.onHandQty}: <b>{describeQty(batch?.qtyOnHand ?? 0, l.units)}</b>
                      </span>
                    )}
                    <span className="pline__total">
                      {g.lineCost}: <b dir="ltr">{fromPiastresGrouped(lineCost(l))}</b>
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
          <span className="gret__total-label">{g.totalLabel}</span>
          <span className="gret__total-value" dir="ltr">
            {fromPiastresGrouped(totalCost)} <small>{ar.common.currency}</small>
          </span>
        </div>
        <dl className="gret__facts">
          <div>
            <dt>{r.supplier}</dt>
            <dd>{supplier?.nameAr ?? '—'}</dd>
          </div>
          <div>
            <dt>{ar.salesReturns.general.itemsCount}</dt>
            <dd>{lines.length}</dd>
          </div>
        </dl>
        <label className="formfield">
          <span className="formfield__label">{r.reason}</span>
          <input className="field" value={reason} placeholder={g.reasonPlaceholder} maxLength={300} onChange={(e) => setReason(e.target.value)} />
        </label>
        <button type="button" className="btn btn--primary gret__confirm" onClick={() => void submit()} disabled={saving || lines.length === 0}>
          {r.confirm}
          <span className="gret__key" dir="ltr">
            F12
          </span>
        </button>
        <p className="gret__note">{g.note}</p>
      </aside>
    </div>
  );
}
