/**
 * فاتورة شراء — blueprint §1.7.
 *
 * Supplier autocomplete, per-line expiry, header expenses and extra
 * discount. Landed cost per line is a live client-side preview only — the
 * authoritative figure is written by confirmPurchaseInvoice inside its
 * transaction, using the exact same packages/core/landedCost() function
 * against the persisted lines, not this preview.
 *
 * The بونص (bonus/free-goods) and ضريبة % (tax) columns have no UI here by
 * request — see the comments on DraftLine.bonusInUnit and DraftLine.taxPct.
 */

import { mixedQty } from '../../lib/units';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ItemListRow, SupplierRow, WarehouseRow } from '@pharmacy/shared';
import { fromPiastres, landedCost, lineValue, toAsciiDigits, toBaseUnits, todayLocal, type LandedCostLine, fromPiastresGrouped } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { PortalAutocomplete } from '../../components/PortalAutocomplete';
import { QuickItemDialog } from '../../components/QuickItemDialog';

import { useBarcodeScanner } from '../../hardware/scanner';
import { loadScannerConfig } from '../../hardware/config';
import { errorText } from '../../lib/errors';
import { usePageShortcuts } from '../../lib/workspace';
import { SearchInput } from '../../components/SearchInput';

interface UnitOption {
  id: number;
  nameAr: string;
  factor: number;
  /** Selling price of this unit (piastres) — the purchase price is derived from it. */
  salePrice: number;
}

/** Purchase price from a unit's selling price and the pharmacist discount (settings). */
function priceFromSale(salePrice: number, discountPct: number): number | null {
  return salePrice > 0 ? Math.round((salePrice * (100 - discountPct)) / 100) : null;
}

interface DraftLine {
  key: number;
  item: ItemListRow | null;
  itemQuery: string;
  itemResults: ItemListRow[];
  unitOptions: UnitOption[];
  unitId: number | null;
  unitFactor: number;
  qtyInUnit: string;
  /** No UI to edit this — the بونص column was removed from the grid, so
      this always stays '' (→ bonusBase 0 in landedCost). Kept as a real
      field rather than deleted so the concept isn't ripped out of the
      landed-cost math entirely; re-adding a column here is all it'd take
      to make free/bonus units editable again. */
  bonusInUnit: string;
  batchNumber: string;
  expiryDate: string;
  /** Always derived: the selling price − خصم الصيدلي (settings). Never typed. */
  unitPurchasePrice: number | null;
  /** Selling price of the chosen unit (piastres) — what the pharmacist types. */
  salePrice: number | null;
  /** The selling price was typed here: on save it becomes the item's price everywhere. */
  salePriceEdited?: boolean;
  discountPct: string;
  /** No UI to edit this either — the ضريبة % column was removed from the
      grid, same reasoning as bonusInUnit above: stays '' (→ taxAmt 0),
      kept as a real field so landedCost's tax math isn't torn out, just
      unreachable from this form until a column is added back. */
  taxPct: string;
  /** Current on-hand quantity (base units) for this item in the selected
      warehouse — null while loading/unknown, so the column can show a
      loading state instead of a misleading 0. Refreshed whenever the item
      or the invoice's warehouse changes. */
  qtyOnHand: number | null;
}

/** Base units, or null when the quantity would split a tablet (never throws — used while typing). */
function safeBase(qty: string, factor: number): number | null {
  const n = Number(qty);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    return toBaseUnits(n, factor);
  } catch {
    return null;
  }
}

/** A line's value after its discount and tax (piastres), or null while incomplete. */
function lineNet(l: { item: unknown; qtyInUnit: string; unitPurchasePrice: number | null; discountPct: string; taxPct: string }): number | null {
  const qty = Number(l.qtyInUnit);
  if (!l.item || !(qty > 0) || l.unitPurchasePrice == null) return null;
  const before = lineValue(qty, l.unitPurchasePrice);
  const afterDiscount = before - Math.round((before * Number(l.discountPct || 0)) / 100);
  return afterDiscount + Math.round((afterDiscount * Number(l.taxPct || 0)) / 100);
}

/** The typed selling price differs from what the item has stored for that unit. */
function priceChanged(l: Pick<DraftLine, 'salePrice' | 'unitId' | 'unitOptions'>): boolean {
  const stored = l.unitOptions.find((u) => u.id === l.unitId)?.salePrice ?? 0;
  return l.salePrice != null && l.salePrice > 0 && l.salePrice !== stored;
}

type LineField = 'item' | 'qty' | 'price' | 'expiry';

let keySeq = 1;
const newLine = (): DraftLine => ({
  key: keySeq++,
  item: null,
  itemQuery: '',
  itemResults: [],
  unitOptions: [],
  unitId: null,
  unitFactor: 1,
  qtyInUnit: '',
  bonusInUnit: '',
  batchNumber: '',
  expiryDate: '',
  unitPurchasePrice: null,
  salePrice: null,
  discountPct: '',
  taxPct: '',
  qtyOnHand: null,
});

interface Props {
  onSaved: () => void;
  onCancel: () => void;
}

export function PurchaseForm({ onSaved, onCancel }: Props) {
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierResults, setSupplierResults] = useState<SupplierRow[]>([]);
  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [supplierBalance, setSupplierBalance] = useState<number | null>(null);

  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);

  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [purchaseType, setPurchaseType] = useState<'cash' | 'credit'>('credit');
  const [invoiceDate, setInvoiceDate] = useState(() => todayLocal());
  const [expenses, setExpenses] = useState<number | null>(null);
  const [extraDiscountAmt, setExtraDiscountAmt] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const savedInvoiceId = useRef<number | null>(null);

  // One stable ref per line, keyed by the line's own key — PortalAutocomplete
  // needs a real anchor element to measure (getBoundingClientRect) for the
  // item-search dropdown it portals to document.body. A row is rendered
  // inline inside lines.map() rather than as its own component, so a plain
  // useRef() per row isn't available; this Map plus a lazy getter gives each
  // row a ref object that survives across re-renders without violating the
  // rules of hooks.
  const itemInputRefs = useRef(new Map<number, React.RefObject<HTMLInputElement>>());
  function getItemInputRef(key: number): React.RefObject<HTMLInputElement> {
    let ref = itemInputRefs.current.get(key);
    if (!ref) {
      ref = { current: null };
      itemInputRefs.current.set(key, ref);
    }
    return ref;
  }

  useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      setWarehouses(list);
      const def = list.find((w) => w.isDefault);
      if (def) setWarehouseId(def.id);
    });
  }, []);

  // The "current stock" column is scoped to whichever warehouse this
  // invoice is landing into — switching that selector mid-entry must
  // refresh every already-picked line's figure, not leave it showing a
  // stale count from the previously selected warehouse.
  useEffect(() => {
    if (warehouseId == null) return;
    for (const line of lines) {
      if (line.item) loadStockForLine(line.key, line.item.id);
    }
    // Only re-run when the warehouse itself changes — loadStockForLine
    // reads the current `lines` via closure, and re-running this on every
    // line edit would refetch stock on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId]);

  useEffect(() => {
    if (!window.api || !supplierQuery.trim()) {
      setSupplierResults([]);
      return;
    }
    const t = setTimeout(() => {
      void window.api!.suppliers.search(supplierQuery, 10).then(setSupplierResults);
    }, 120);
    return () => clearTimeout(t);
  }, [supplierQuery]);

  useEffect(() => {
    if (!supplier || !window.api) {
      setSupplierBalance(null);
      return;
    }
    void window.api.suppliers.balance(supplier.id).then(setSupplierBalance);
  }, [supplier]);

  function selectSupplier(s: SupplierRow) {
    setSupplier(s);
    setSupplierQuery(s.nameAr);
    setSupplierResults([]);
  }

  function updateLine(key: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function searchItemsForLine(key: number, query: string) {
    // Typing again after a selection clears it -- the user is picking a new
    // item, not editing free text next to the old one.
    updateLine(key, { itemQuery: query, item: null, itemResults: [], qtyOnHand: null });
    setSuggestIndex(0);
    if (!window.api || query.trim() === '') return;
    void window.api.items.search(query, 10).then((results) => updateLine(key, { itemResults: results }));
  }

  // Current stock for this item in the invoice's warehouse — the whole
  // point of showing it here is knowing what's already on the shelf before
  // deciding how much to reorder, so it must be scoped to the same
  // warehouse the purchase is actually landing stock into, not a
  // cross-warehouse total that overstates what's really there.
  function loadStockForLine(key: number, itemId: number) {
    if (!window.api || warehouseId == null) return;
    void window.api.stock.sellableBatches(itemId, warehouseId).then((batches) => {
      const total = batches.reduce((sum, b) => sum + b.qtyOnHand, 0);
      updateLine(key, { qtyOnHand: total });
    });
  }

  // ---- Keyboard flow: item → Enter → quantity … → Enter → next line ------
  // Each line's fields carry data-field; after a state change the focus
  // request is honoured once the new line is on screen.
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const [quickAdd, setQuickAdd] = useState<{ key: number; name: string; barcode?: string } | null>(null);
  // خصم الصيدلي from settings: the purchase price defaults to selling price − this %.
  const [discountPct, setDiscountPct] = useState(20);
  const discountPctRef = useRef(discountPct);
  discountPctRef.current = discountPct;
  useEffect(() => {
    void window.api?.settings.get().then((s) => setDiscountPct(s.purchaseDiscountPct));
  }, []);
  const [suggestIndex, setSuggestIndex] = useState(0);
  const [focusReq, setFocusReq] = useState<{ key: number; field: LineField } | null>(null);
  const [lineHint, setLineHint] = useState<{ key: number; text: string } | null>(null);
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

  /** The first required field still missing on a line, or null when it is complete. */
  function missingField(l: DraftLine): { field: LineField; text: string } | null {
    if (!l.item) return { field: 'item', text: ar.purchases.lines.needItem };
    if (!(Number(l.qtyInUnit) > 0) || safeBase(l.qtyInUnit, l.unitFactor) === null) return { field: 'qty', text: ar.purchases.lines.needQty };
    if (l.unitPurchasePrice === null) return { field: 'price', text: ar.purchases.lines.needPrice };
    if (!l.item.noExpiry && (!l.expiryDate || l.expiryDate <= todayLocal())) return { field: 'expiry', text: ar.purchases.lines.needExpiry };
    return null;
  }

  /** Go to the next line — reusing an empty one, else adding it — and put the cursor in its item search. */
  function nextLine(fromKey: number) {
    const idx = lines.findIndex((l) => l.key === fromKey);
    const empty = lines.slice(idx + 1).find((l) => l.item === null) ?? lines.find((l) => l.item === null && l.key !== fromKey);
    if (empty) return setFocusReq({ key: empty.key, field: 'item' });
    const fresh = newLine();
    setLines((prev) => [...prev, fresh]);
    setFocusReq({ key: fresh.key, field: 'item' });
  }

  /** Enter anywhere in a line: complete → next line; otherwise jump to what is missing. */
  function onLineKeyDown(e: React.KeyboardEvent<HTMLDivElement>, line: DraftLine) {
    if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
    const target = e.target as HTMLElement;
    if (target.dataset.field === 'item') return; // handled by the search box itself
    e.preventDefault();
    // The latest values, not the render this handler was created in: a date
    // typed digit by digit may land in state a moment after its keystrokes.
    let current = linesRef.current.find((l) => l.key === line.key) ?? line;
    if (target.dataset.field === 'expiry' && target instanceof HTMLInputElement && target.value !== current.expiryDate) {
      current = { ...current, expiryDate: target.value };
      updateLine(line.key, { expiryDate: target.value });
    }
    const missing = missingField(current);
    if (missing) {
      setLineHint({ key: line.key, text: missing.text });
      setFocusReq({ key: line.key, field: missing.field });
      return;
    }
    setLineHint(null);
    nextLine(line.key);
  }

  /** ↑/↓ through the suggestions, Enter picks (the first one by default). */
  function onItemKeyDown(e: React.KeyboardEvent<HTMLInputElement>, line: DraftLine) {
    const n = line.itemResults.length;
    if (e.code === 'ArrowDown' && n) {
      e.preventDefault();
      setSuggestIndex((i) => (i + 1) % n);
    } else if (e.code === 'ArrowUp' && n) {
      e.preventDefault();
      setSuggestIndex((i) => (i - 1 + n) % n);
    } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault();
      const pick = line.itemResults[Math.min(suggestIndex, n - 1)];
      if (pick) selectItemForLine(line.key, pick);
      else if (line.item) setFocusReq({ key: line.key, field: 'qty' });
      else if (line.itemQuery.trim()) setQuickAdd({ key: line.key, name: line.itemQuery });
    } else if (e.code === 'Escape' && n) {
      updateLine(line.key, { itemResults: [] });
    }
  }

  function selectItemForLine(key: number, item: ItemListRow) {
    setSuggestIndex(0);
    setLineHint(null);
    setFocusReq({ key, field: 'qty' });
    updateLine(key, {
      item,
      itemQuery: item.nameAr,
      itemResults: [],
      unitOptions: [],
      unitId: null,
      // Default to the item's base unit factor; refined once units are
      // fetched. Purchase entry works in whatever unit the pharmacist types.
      unitFactor: 1,
      qtyOnHand: null,
    });
    loadStockForLine(key, item.id);
    if (!window.api) return;
    void window.api.items.get(item.id).then((detail) => {
      const options = detail?.units.map((u) => ({ id: u.id, nameAr: u.nameAr, factor: u.factor, salePrice: u.salePrice })) ?? [];
      const defaultUnit = detail?.units.find((u) => u.isDefaultSale) ?? detail?.units[0];
      // unit_id is a real foreign key to item_units (docs/schema.sql) — every
      // item has its own distinct rows there, so this must carry the actual
      // id resolved per item, never a hardcoded value that may belong to an
      // unrelated item or not exist at all.
      if (defaultUnit) {
        // The selling price comes from the item; purchase price = it − خصم الصيدلي.
        const salePrice = defaultUnit.salePrice > 0 ? defaultUnit.salePrice : null;
        updateLine(key, {
          unitOptions: options,
          unitId: defaultUnit.id,
          unitFactor: defaultUnit.factor,
          salePrice,
          salePriceEdited: false,
          unitPurchasePrice: priceFromSale(salePrice ?? 0, discountPctRef.current),
        });
      }
      else updateLine(key, { unitOptions: options });
    });
  }

  // Barcode scan resolves straight to the item (blueprint hardware doc
  // §1.4's routing table — reads event.code, never event.key, per rule 4).
  // Fills whichever line is still empty (the row a pharmacist is about to
  // type into); if every line already has an item, a fresh row is appended
  // so scanning item after item just keeps building the invoice downward,
  // the same rhythm as the POS screen.
  useBarcodeScanner(
    async (event) => {
      if (!window.api) return;
      const item = await window.api.items.findByBarcode(event.code);
      if (!item) {
        const target = lines.find((l) => l.item === null) ?? lines[lines.length - 1]!;
        setQuickAdd({ key: target.key, name: '', barcode: event.code });
        return;
      }
      const emptyLine = lines.find((l) => l.item === null);
      if (emptyLine) {
        selectItemForLine(emptyLine.key, item);
      } else {
        const line = newLine();
        setLines((prev) => [...prev, line]);
        selectItemForLine(line.key, item);
      }
    },
    {
      config: loadScannerConfig(),
      shouldIgnore: () => {
        const el = document.activeElement as HTMLElement | null;
        return el?.tagName === 'SELECT';
      },
    }
  );

  // Live preview only. Confirmed values are recomputed server-side from the
  // persisted rows by the exact same landedCost() call.
  const preview = useMemo(() => {
    const inputs: LandedCostLine[] = [];
    // landedCost() throws for any line whose qtyBase + bonusBase is <= 0
    // (packages/core/src/landed-cost.ts) — Number(l.qtyInUnit) > 0 excludes
    // an entered "0" (a non-empty, and so previously truthy, string) before
    // it reaches that call. Without this a typed "0" threw inside this
    // useMemo on every render, crashing the whole form.
    // A quantity that would split a tablet is left out of the preview (and
    // rejected on save) instead of throwing inside render and blanking the form.
    const valid = lines.filter(
      (l) => l.item && safeBase(l.qtyInUnit, l.unitFactor) !== null && l.unitPurchasePrice != null
    );

    for (const l of valid) {
      const qtyBase = safeBase(l.qtyInUnit, l.unitFactor)!;
      const bonusBase = l.bonusInUnit ? safeBase(l.bonusInUnit, l.unitFactor) ?? 0 : 0;
      const beforeDiscount = lineValue(Number(l.qtyInUnit), l.unitPurchasePrice ?? 0);
      const discountAmt = Math.round((beforeDiscount * Number(l.discountPct || 0)) / 100);
      const afterDiscount = beforeDiscount - discountAmt;
      const taxAmt = Math.round((afterDiscount * Number(l.taxPct || 0)) / 100);
      const afterTax = afterDiscount + taxAmt;
      inputs.push({ lineNo: l.key, lineTotal: afterTax, qtyBase, bonusBase });
    }

    if (inputs.length === 0) return { subtotal: 0, taxTotal: 0, total: 0, costs: new Map<number, number>(), packCosts: new Map<number, number>() };

    const costs = landedCost(inputs, expenses ?? 0, extraDiscountAmt ?? 0);
    const subtotal = valid.reduce((s, l) => s + lineValue(Number(l.qtyInUnit), l.unitPurchasePrice ?? 0), 0);
    const total = inputs.reduce((s, i) => s + i.lineTotal, 0) + (expenses ?? 0) - (extraDiscountAmt ?? 0);

    return {
      subtotal,
      taxTotal: 0,
      total,
      costs: new Map(costs.map((c) => [c.lineNo, c.landedUnitCost])),
      // Cost of ONE purchased unit (e.g. one box), bonus included:
      // (line total + its share of expenses − its share of the extra discount) ÷ (qty + bonus).
      packCosts: new Map(
        costs.map((c) => {
          const l = valid.find((x) => x.key === c.lineNo)!;
          const input = inputs.find((x) => x.lineNo === c.lineNo)!;
          const units = Number(l.qtyInUnit) + (Number(l.bonusInUnit) || 0);
          return [c.lineNo, Math.round((input.lineTotal + c.allocatedExpense - c.allocatedDiscount) / units)];
        })
      ),
    };
  }, [lines, expenses, extraDiscountAmt]);

  async function submit(confirmAfterSave: boolean) {
    setError(null);
    if (!supplier) return setError(ar.purchases.errors.noSupplier);
    if (!warehouseId) return setError(ar.purchases.errors.noWarehouse);
    const validLines = lines.filter((l) => l.item);
    if (validLines.length === 0) return setError(ar.purchases.errors.noLines);
    // landedCost (run at confirm, and already guarded in the live preview
    // above) rejects any line whose qty + bonus is zero — checked here too
    // since a line can be added and left at qty "" or "0" without ever
    // triggering the preview's own filter.
    if (validLines.some((l) => !(Number(l.qtyInUnit) > 0))) return setError(ar.purchases.errors.qtyRequired);
    if (invoiceDate > todayLocal()) return setError(ar.purchases.errors.futureDate);
    // A line with no price was saved at cost 0 — every later profit figure
    // for that batch was then pure margin. Zero is allowed only when typed.
    const unpriced = validLines.find((l) => l.unitPurchasePrice === null);
    if (unpriced) return setError(ar.purchases.errors.priceRequired.replace('{item}', unpriced.item!.nameAr));
    const pctBad = (v: string) => v.trim() !== '' && !(Number(v) >= 0 && Number(v) <= 100);
    if (validLines.some((l) => pctBad(l.discountPct) || pctBad(l.taxPct))) return setError(ar.errors['purchase.discountInvalid']);
    const badBonus = validLines.find((l) => l.bonusInUnit.trim() !== '' && Number(l.bonusInUnit) !== 0 && safeBase(l.bonusInUnit, l.unitFactor) === null);
    if (badBonus) return setError(ar.purchases.errors.bonusInvalid.replace('{item}', badBonus.item!.nameAr));
    const fractional = validLines.find((l) => safeBase(l.qtyInUnit, l.unitFactor) === null);
    if (fractional) {
      const unit = fractional.unitOptions.find((u) => u.id === fractional.unitId);
      return setError(
        ar.errors['purchase.qtyNotWhole']
          .replace('{qty}', fractional.qtyInUnit)
          .replace('{unit}', unit?.nameAr ?? '')
          .replace('{item}', fractional.item!.nameAr)
      );
    }
    // unitId only resolves once items.get() returns (selectItemForLine); an
    // item with no configured units at all would otherwise reach the
    // NOT NULL unit_id foreign key with nothing to send.
    if (validLines.some((l) => l.unitId == null)) return setError(ar.purchases.errors.itemRequired);
    // Expiry drives FEFO allocation and the expiry report — a blank date on
    // an item that does track expiry silently breaks both for that batch,
    // with nothing else in the form or the repository catching it.
    if (validLines.some((l) => !l.item!.noExpiry && !l.expiryDate)) {
      return setError(ar.purchases.errors.expiryRequired);
    }
    const expired = validLines.find((l) => !l.item!.noExpiry && l.expiryDate <= todayLocal());
    if (expired) {
      return setError(
        ar.errors['purchase.expiryPast'].replace('{item}', expired.item!.nameAr).replace('{date}', expired.expiryDate)
      );
    }
    if (!window.api) return setError(ar.status.noBridge);

    setSaving(true);
    try {
      // A draft already saved by an earlier click (e.g. confirm failed and the
      // pharmacist fixed nothing but clicks confirm again) is confirmed, not
      // created a second time.
      if (savedInvoiceId.current != null) {
        if (confirmAfterSave) await window.api.purchases.confirm(savedInvoiceId.current);
        onSaved();
        return;
      }
      const input = {
        supplierInvoiceNo: supplierInvoiceNo.trim() || `AUTO-${Date.now()}`,
        supplierId: supplier.id,
        warehouseId,
        purchaseType,
        invoiceDate,
        expenses: expenses ?? 0,
        extraDiscountAmt: extraDiscountAmt ?? 0,
        notes: notes.trim() || null,
        lines: validLines.map((l, i) => ({
          lineNo: i + 1,
          itemId: l.item!.id,
          unitId: l.unitId!,
          qtyInUnit: Number(l.qtyInUnit),
          bonusInUnit: l.bonusInUnit ? Number(l.bonusInUnit) : 0,
          batchNumber: l.batchNumber.trim() || null,
          expiryDate: l.item!.noExpiry ? null : l.expiryDate || null,
          unitPurchasePrice: l.unitPurchasePrice ?? 0,
          ...(l.salePriceEdited && priceChanged(l) ? { salePrice: l.salePrice! } : {}),
          discountPct: Number(l.discountPct || 0),
          taxPct: Number(l.taxPct || 0),
        })),
      };

      const id = await window.api.purchases.create(input);
      savedInvoiceId.current = id;

      if (confirmAfterSave) {
        await window.api.purchases.confirm(id);
      }
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  /** «+ إضافة صنف» / F12: a new line with the cursor already in its item search. */
  function addLine() {
    const fresh = newLine();
    setLines((prev) => [...prev, fresh]);
    setFocusReq({ key: fresh.key, field: 'item' });
  }
  const addLineRef = useRef(addLine);
  addLineRef.current = addLine;

  usePageShortcuts(
    () => [
      { id: 'cancel', code: 'Escape', run: onCancel },
      { id: 'addRow', code: 'F12', run: () => addLineRef.current() },
    ],
    [onCancel]
  );

  return (
    <div className="item-form">
      {error && <div className="alert alert--error">{error}</div>}

      <div className="panel">
        <div className="grid2">
          <label className="formfield field-wrap">
            <span className="formfield__label">
              {ar.purchases.supplier}
              <span className="req"> *</span>
            </span>
            <SearchInput
              className="field"
              value={supplierQuery}
              placeholder={ar.purchases.supplierSearch}
              onChange={(e) => {
                setSupplierQuery(e.target.value);
                setSupplier(null);
              }}
            />
            {supplierResults.length > 0 && (
              <ul className="autocomplete">
                {supplierResults.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => selectSupplier(s)}>
                      <span>{s.nameAr}</span> <span dir="ltr">#{s.code}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>

          {supplier && (
            <div className="formfield">
              <span className="formfield__label">{ar.purchases.supplierBalance}</span>
              <span dir="ltr" className="strong">
                {supplierBalance === null ? '—' : fromPiastres(supplierBalance)}
              </span>
            </div>
          )}

          <label className="formfield">
            <span className="formfield__label">
              {ar.purchases.warehouse}
              <span className="req"> *</span>
            </span>
            <select
              className="field"
              value={warehouseId ?? ''}
              onChange={(e) => setWarehouseId(Number(e.target.value))}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.nameAr}
                </option>
              ))}
            </select>
          </label>

          <label className="formfield">
            <span className="formfield__label">{ar.purchases.purchaseType}</span>
            <select
              className="field"
              value={purchaseType}
              onChange={(e) => setPurchaseType(e.target.value as 'cash' | 'credit')}
            >
              <option value="credit">{ar.purchases.credit}</option>
              <option value="cash">{ar.purchases.cash}</option>
            </select>
            <span className="hint">{purchaseType === 'cash' ? ar.purchases.cashHint : ar.purchases.creditHint}</span>
          </label>

          <label className="formfield">
            <span className="formfield__label">{ar.purchases.supplierInvoiceNo}</span>
            <input
              className="field"
              dir="ltr"
              value={supplierInvoiceNo}
              onChange={(e) => setSupplierInvoiceNo(e.target.value)}
            />
          </label>

          <label className="formfield">
            <span className="formfield__label">{ar.purchases.invoiceDate}</span>
            <input
              className="field"
              type="date"
              dir="ltr"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </label>
        </div>

        <section className="plines" aria-label={ar.items.tabs.pricing}>
          <div className="plines__head">
            <h2 className="section-heading section-heading--inline">{ar.items.tabs.pricing}</h2>
            <span className="muted small">{ar.purchases.lines.count.replace('{n}', String(lines.filter((l) => l.item).length))}</span>
          </div>

          {lines.map((line, index) => {
            const net = lineNet(line);
            const cost = preview.costs.get(line.key);
            const packCost = preview.packCosts.get(line.key);
            const unitName = line.unitOptions.find((u) => u.id === line.unitId)?.nameAr ?? '';
            const baseName = line.unitOptions.find((u) => u.factor === 1)?.nameAr ?? '';
            return (
              <div
                key={line.key}
                data-line={line.key}
                className={line.item ? 'pline' : 'pline pline--empty'}
                onKeyDown={(e) => onLineKeyDown(e, line)}
              >
                <div className="pline__top">
                  <span className="pline__no">{index + 1}</span>
                  <div className="pline__item">
                    <input
                      ref={getItemInputRef(line.key)}
                      className="field"
                      placeholder={ar.purchases.lines.itemPlaceholder}
                      aria-label={ar.purchases.grid.item}
                      data-field="item"
                      value={line.itemQuery}
                      onChange={(e) => searchItemsForLine(line.key, e.target.value)}
                      onKeyDown={(e) => onItemKeyDown(e, line)}
                    />
                    <PortalAutocomplete
                      anchorRef={getItemInputRef(line.key)}
                      items={line.itemResults}
                      activeIndex={Math.min(suggestIndex, line.itemResults.length - 1)}
                      footer={
                        line.itemQuery.trim() && !line.item
                          ? { label: ar.quickItem.openNamed.replace('{name}', line.itemQuery.trim()), onClick: () => setQuickAdd({ key: line.key, name: line.itemQuery }) }
                          : null
                      }
                      getKey={(it) => it.id}
                      onSelect={(it) => selectItemForLine(line.key, it)}
                    >
                      {(it) => <span>{it.nameAr}</span>}
                    </PortalAutocomplete>
                  </div>
                  {line.item && (
                    <span className="pline__stock" title={ar.purchases.grid.currentStock}>
                      {ar.purchases.grid.currentStock}:{' '}
                      <b>{line.qtyOnHand === null ? '…' : line.qtyOnHand > 0 ? mixedQty(line.qtyOnHand, line.unitOptions) : ar.items.list.out}</b>
                    </span>
                  )}
                  <button
                    type="button"
                    className="pline__remove"
                    onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                    disabled={lines.length === 1}
                    title={ar.purchases.grid.remove}
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
                      disabled={line.unitOptions.length === 0}
                      onChange={(e) => {
                        const chosen = line.unitOptions.find((u) => u.id === Number(e.target.value));
                        if (!chosen) return;
                        // The price follows the unit (box 80 → strip 40); a typed
                        // price is carried over in proportion.
                        const sale =
                          line.salePriceEdited && line.salePrice != null
                            ? Math.round((line.salePrice * chosen.factor) / line.unitFactor)
                            : chosen.salePrice > 0
                              ? chosen.salePrice
                              : null;
                        updateLine(line.key, {
                          unitId: chosen.id,
                          unitFactor: chosen.factor,
                          salePrice: sale,
                          unitPurchasePrice: priceFromSale(sale ?? 0, discountPctRef.current),
                        });
                      }}
                    >
                      {line.unitOptions.length === 0 && <option value="">—</option>}
                      {line.unitOptions.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.factor > 1 ? `${u.nameAr} (${u.factor})` : u.nameAr}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="formfield">
                    <span className="formfield__label">
                      {ar.purchases.grid.qty}
                      <span className="req"> *</span>
                    </span>
                    <input
                      className="field"
                      dir="ltr"
                      inputMode="decimal"
                      data-field="qty"
                      value={line.qtyInUnit}
                      onChange={(e) => updateLine(line.key, { qtyInUnit: toAsciiDigits(e.target.value) })}
                    />
                  </label>
                  <label className="formfield">
                    <span className="formfield__label">{ar.purchases.grid.bonus}</span>
                    <input
                      className="field"
                      dir="ltr"
                      inputMode="decimal"
                      placeholder="0"
                      value={line.bonusInUnit}
                      onChange={(e) => updateLine(line.key, { bonusInUnit: toAsciiDigits(e.target.value) })}
                    />
                  </label>
                  <label className="formfield">
                    <span className="formfield__label">
                      {ar.purchases.grid.price}
                      <span className="req"> *</span>
                    </span>
                    <MoneyInput
                      field="price"
                      value={line.salePrice}
                      onChange={(v) =>
                        updateLine(line.key, {
                          salePrice: v,
                          salePriceEdited: true,
                          unitPurchasePrice: priceFromSale(v ?? 0, discountPctRef.current),
                        })
                      }
                    />
                    {line.unitPurchasePrice != null && (
                      <span className="hint">
                        {ar.purchases.lines.purchasePrice
                          .replace('{price}', fromPiastres(line.unitPurchasePrice))
                          .replace('{pct}', String(discountPct))}
                      </span>
                    )}
                    {line.salePriceEdited && priceChanged(line) && (
                      <span className="hint">{ar.purchases.lines.priceWillUpdate}</span>
                    )}
                  </label>
                  <label className="formfield">
                    <span className="formfield__label">{ar.purchases.grid.discount}</span>
                    <input
                      className="field"
                      dir="ltr"
                      inputMode="decimal"
                      placeholder="0"
                      value={line.discountPct}
                      onChange={(e) => updateLine(line.key, { discountPct: toAsciiDigits(e.target.value) })}
                    />
                  </label>
                  <label className="formfield">
                    <span className="formfield__label">{ar.purchases.grid.tax}</span>
                    <input
                      className="field"
                      dir="ltr"
                      inputMode="decimal"
                      placeholder="0"
                      value={line.taxPct}
                      onChange={(e) => updateLine(line.key, { taxPct: toAsciiDigits(e.target.value) })}
                    />
                  </label>
                  <label className="formfield">
                    <span className="formfield__label">{ar.purchases.grid.batchNumber}</span>
                    <input
                      className="field"
                      dir="ltr"
                      value={line.batchNumber}
                      onChange={(e) => updateLine(line.key, { batchNumber: e.target.value })}
                    />
                  </label>
                  <label className="formfield">
                    <span className="formfield__label">
                      {ar.purchases.grid.expiryDate}
                      {!line.item?.noExpiry && <span className="req"> *</span>}
                    </span>
                    <input
                      className="field"
                      type="date"
                      dir="ltr"
                      min={todayLocal()}
                      data-field="expiry"
                      disabled={Boolean(line.item?.noExpiry)}
                      value={line.item?.noExpiry ? '' : line.expiryDate}
                      onChange={(e) => updateLine(line.key, { expiryDate: e.target.value })}
                    />
                  </label>
                </div>

                {lineHint?.key === line.key && <div className="pline__hint">{lineHint.text}</div>}
                {line.item && (
                  <div className="pline__foot">
                    <span>
                      {ar.purchases.lines.unitCost.replace('{unit}', unitName)}:{' '}
                      <b dir="ltr">{packCost !== undefined ? fromPiastres(packCost) : '—'}</b>
                      {line.unitFactor > 1 && cost !== undefined && (
                        <span className="muted">
                          {' '}
                          · {ar.purchases.lines.baseCost.replace('{base}', baseName)}: <span dir="ltr">{fromPiastresGrouped(cost)}</span>
                        </span>
                      )}
                    </span>
                    <span className="pline__total">
                      {ar.purchases.lines.lineTotal}: <b dir="ltr">{net !== null ? fromPiastres(net) : '—'}</b>
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          <div className="plines__actions">
            <button type="button" className="btn plines__add" onClick={() => addLineRef.current()}>
              + {ar.purchases.lines.add}
            </button>
            <span className="muted small">{ar.purchases.lines.enterTip}</span>
          </div>
        </section>

        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.purchases.expenses}</span>
            <MoneyInput value={expenses} onChange={setExpenses} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.purchases.extraDiscountAmt}</span>
            <MoneyInput value={extraDiscountAmt} onChange={setExtraDiscountAmt} />
          </label>
          <label className="formfield span2">
            <span className="formfield__label">{ar.purchases.notes}</span>
            <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>

        <div className="psummary">
          <div>
            <span>{ar.purchases.lines.gross}</span>
            <b dir="ltr">{fromPiastresGrouped(preview.subtotal)}</b>
          </div>
          <div>
            <span>{ar.purchases.lines.afterLines}</span>
            <b dir="ltr">{fromPiastresGrouped(lines.reduce((sum, l) => sum + (lineNet(l) ?? 0), 0))}</b>
          </div>
          {(expenses ?? 0) > 0 && (
            <div>
              <span>{ar.purchases.expenses}</span>
              <b dir="ltr">+{fromPiastres(expenses ?? 0)}</b>
            </div>
          )}
          {(extraDiscountAmt ?? 0) > 0 && (
            <div>
              <span>{ar.purchases.extraDiscountAmt}</span>
              <b dir="ltr">−{fromPiastres(extraDiscountAmt ?? 0)}</b>
            </div>
          )}
          <div className="psummary__total">
            <span>{ar.purchases.total}</span>
            <b dir="ltr">{fromPiastresGrouped(preview.total)}</b>
          </div>
        </div>
      </div>
      {/* Always in view: what the invoice comes to, and what to do with it. */}
      <div className="form-savebar">
        <div className="form-savebar__sum">
          <span className="form-savebar__label">{ar.purchases.total}</span>
          <b dir="ltr">
            {fromPiastresGrouped(preview.total)} <small>{ar.common.currency}</small>
          </b>
          <span className="form-savebar__hint">{ar.purchases.confirmWarning}</span>
        </div>
        <div className="form-savebar__actions">
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            {ar.items.actions.cancel}
          </button>
          <button type="button" className="btn" onClick={() => void submit(false)} disabled={saving}>
            {ar.purchases.save}
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void submit(true)} disabled={saving}>
            {ar.purchases.confirm}
          </button>
        </div>
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
            selectItemForLine(key, item);
          }}
        />
      )}
    </div>
  );
}
