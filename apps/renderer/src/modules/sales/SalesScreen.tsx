/**
 * فواتير المبيعات — the till.
 *
 * Scan or search → the item lands in the cart in its default sale unit
 * (usually the box); the pharmacist can switch any line to strip or tablet.
 * Prices come from the item's units; the server re-reads them on checkout
 * (the renderer is never trusted for a price). Checkout is ONE call
 * (sales.checkout) — create and confirm in a single transaction — so a failed
 * sale leaves nothing behind.
 *
 * Keyboard only (rule 12): F2 search, F4 cash/credit, F12 pay, Esc clears the
 * search. Shortcuts read event.code (rule 4).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AlternativeRow,
  CustomerRow,
  HeldInvoiceRow,
  InsuranceCompanyRow,
  ItemListRow,
  PharmacySettings,
  PrescriptionInput,
} from '@pharmacy/shared';
import { addDays, fromPiastres, lineValue, toAsciiDigits, toBaseUnits, toPiastres, todayLocal } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { Stat } from '../../components/Stat';
import { useToast } from '../../components/Toast';
import { useBarcodeScanner } from '../../hardware/scanner';
import { loadScannerConfig } from '../../hardware/config';
import { EmptyState } from '../../components/EmptyState';
import { MoneyInput } from '../../components/MoneyInput';

import { errorCode, errorText } from '../../lib/errors';
import { PrescriptionDialog } from '../../components/PrescriptionDialog';
import { usePageDirty, usePageShortcuts } from '../../lib/workspace';
import { SearchInput } from '../../components/SearchInput';

interface UnitOption {
  id: number;
  nameAr: string;
  factor: number;
  salePrice: number;
}

interface CartLine {
  key: number;
  item: ItemListRow;
  units: UnitOption[];
  unitId: number;
  /** Raw text while typing — parsed only for math and submit. */
  qty: string;
  /** Flat line discount in EGP as typed. */
  discountEgp: string;
  /** Sellable base units in this warehouse, for the "available" column. */
  availableBase: number;
  /** Earliest sellable expiry, for the near-expiry warning (BR-2). */
  nearestExpiry: string | null;
  requiresPrescription: boolean;
}

function parseQty(text: string): number {
  const n = Number(toAsciiDigits(text));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Piastres from a possibly partial EGP string, never throwing (re-renders on every keystroke). */
function parseDiscountPiastres(text: string): number {
  const trimmed = toAsciiDigits(text).trim();
  if (trimmed === '') return 0;
  try {
    return Math.max(toPiastres(trimmed), 0);
  } catch {
    return 0;
  }
}

function unitOf(line: CartLine): UnitOption {
  return line.units.find((u) => u.id === line.unitId) ?? line.units[0]!;
}

/** Line values exactly as the server will compute them (integer piastres). */
function lineMoney(line: CartLine) {
  const unit = unitOf(line);
  const before = lineValue(parseQty(line.qty), unit.salePrice);
  const discount = Math.min(parseDiscountPiastres(line.discountEgp), before);
  return { unit, before, discount, after: before - discount };
}

/** Whole base units, or null when the quantity would split a tablet. */
function lineBase(line: CartLine): number | null {
  try {
    return toBaseUnits(parseQty(line.qty), unitOf(line).factor);
  } catch {
    return null;
  }
}

let keySeq = 1;

export function SalesScreen() {
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState('');
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemListRow[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [invoiceType, setInvoiceType] = useState<'cash' | 'credit'>('cash');
  const [tendered, setTendered] = useState<number | null>(null);
  /** Insured sale (spec M6): a cash invoice where the company pays its share. */
  const [companies, setCompanies] = useState<InsuranceCompanyRow[]>([]);
  const [insurance, setInsurance] = useState<{ companyId: number; memberNo: string; approvalNo: string } | null>(null);
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());
  const [customer, setCustomer] = useState<CustomerRow | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  /** The last invoice paid on this page — «طباعة آخر فاتورة» / Ctrl+P. */
  const [lastInvoiceId, setLastInvoiceId] = useState<number | null>(null);
  /** BR-7: prescription for the scheduled items in this cart. */
  const [prescription, setPrescription] = useState<PrescriptionInput | null>(null);
  const [askPrescription, setAskPrescription] = useState(false);
  const [alternatives, setAlternatives] = useState<{ item: ItemListRow; rows: AlternativeRow[] } | null>(null);
  const [heldList, setHeldList] = useState<HeldInvoiceRow[] | null>(null);
  /** Set when the prescription dialog was opened by a checkout — the sale continues once it is filled. */
  const continueAfterRx = useRef(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();
  const customerDebounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!window.api) return;
    void window.api.warehouses.list().then((list) => {
      const def = list.find((w) => w.isDefault) ?? list[0];
      if (def) {
        setWarehouseId(def.id);
        setWarehouseName(def.nameAr);
      }
    });
    void window.api.settings.get().then(setSettings);
    void window.api.insurance.companies().then(setCompanies).catch(() => undefined);
  }, []);

  useEffect(() => searchRef.current?.focus(), []);

  /** Build a cart line for an item: its sellable units, stock and nearest expiry in this warehouse. */
  async function buildLine(
    item: ItemListRow,
    preset?: { unitId: number; qtyInUnit: number; discountAmt: number }
  ): Promise<CartLine | null> {
    if (!window.api || warehouseId == null) return null;
    const [detail, batches] = await Promise.all([
      window.api.items.get(item.id),
      window.api.stock.sellableBatches(item.id, warehouseId),
    ]);
    // Only units still for sale — a retired unit stays in history, not on the till.
    const units: UnitOption[] = (detail?.units ?? [])
      .filter((u) => u.allowSale)
      .map((u) => ({ id: u.id, nameAr: u.nameAr, factor: u.factor, salePrice: u.salePrice }))
      .sort((a, b) => b.factor - a.factor);
    const defaultUnit =
      units.find((u) => u.id === preset?.unitId) ?? detail?.units.find((u) => u.isDefaultSale && u.allowSale) ?? units[0];
    if (!defaultUnit) {
      setError(ar.sales.errors.noSellableUnit.replace('{item}', item.nameAr));
      return null;
    }
    return {
      key: keySeq++,
      item: detail ?? item,
      units,
      unitId: defaultUnit.id,
      qty: String(preset?.qtyInUnit ?? 1),
      discountEgp: preset?.discountAmt ? fromPiastres(preset.discountAmt) : '',
      availableBase: batches.reduce((s, b) => s + b.qtyOnHand, 0),
      nearestExpiry: batches.map((b) => b.expiryDate).filter((d): d is string => Boolean(d)).sort()[0] ?? null,
      requiresPrescription: Boolean(detail?.requiresPrescription),
    };
  }

  async function addItemToCart(item: ItemListRow) {
    setError(null);
    const line = await buildLine(item);
    if (!line) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.item.id === item.id && l.unitId === line.unitId);
      if (existing) {
        return prev.map((l) => (l === existing ? { ...l, qty: String(parseQty(l.qty) + 1) } : l));
      }
      return [...prev, line];
    });
    setQuery('');
    setResults([]);
    setAlternatives(null);
    searchRef.current?.focus();
  }

  // A scan resolves the barcode and adds a line (hardware doc §1.4).
  useBarcodeScanner(
    async (event) => {
      if (!window.api) return;
      const item = await window.api.items.findByBarcode(event.code);
      if (item) await addItemToCart(item);
      else setError(ar.sales.errors.barcodeNotFound.replace('{code}', event.code));
    },
    {
      config: loadScannerConfig(),
      shouldIgnore: () => (document.activeElement as HTMLElement | null)?.tagName === 'SELECT',
    }
  );

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

  useEffect(() => {
    if (!window.api || !customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
    if (customerDebounce.current) clearTimeout(customerDebounce.current);
    customerDebounce.current = setTimeout(() => {
      void window.api!.customers.search(customerQuery, 10).then(setCustomerResults);
    }, 120);
    return () => {
      if (customerDebounce.current) clearTimeout(customerDebounce.current);
    };
  }, [customerQuery]);

  function selectInvoiceType(next: 'cash' | 'credit' | 'insurance') {
    if (next === 'insurance') {
      setInvoiceType('cash');
      setCustomer(null);
      if (!insurance && companies[0]) void chooseCompany(companies[0].id);
      return;
    }
    setInsurance(null);
    setInvoiceType(next);
    if (next === 'cash') {
      setCustomer(null);
      setCustomerQuery('');
      setCustomerResults([]);
    } else {
      setTendered(null);
    }
  }

  async function chooseCompany(companyId: number) {
    setInsurance((prev) => ({ companyId, memberNo: prev?.memberNo ?? '', approvalNo: prev?.approvalNo ?? '' }));
    const excluded = await window.api!.insurance.exclusions(companyId).catch(() => []);
    setExcludedIds(new Set(excluded.map((e) => e.itemId)));
  }

  function selectCustomer(c: CustomerRow) {
    setCustomer(c);
    setCustomerQuery('');
    setCustomerResults([]);
  }

  function updateLine(key: number, patch: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: number) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  const totals = useMemo(
    () =>
      cart.reduce(
        (acc, l) => {
          const m = lineMoney(l);
          acc.subtotal += m.before;
          acc.total += m.after;
          return acc;
        },
        { subtotal: 0, total: 0 }
      ),
    [cart]
  );

  // Same split the server applies: coverage % of the lines the company
  // covers, capped per invoice, never above the total.
  const company = insurance ? companies.find((c) => c.id === insurance.companyId) ?? null : null;
  const insuranceShare = (() => {
    if (!company) return 0;
    const covered = cart.filter((l) => !excludedIds.has(l.item.id)).reduce((s, l) => s + lineMoney(l).after, 0);
    let share = Math.round((covered * company.coveragePct) / 100);
    if (company.maxPerInvoice != null) share = Math.min(share, company.maxPerInvoice);
    return Math.max(0, Math.min(share, totals.total));
  })();
  const patientPays = totals.total - insuranceShare;
  const change = tendered !== null ? tendered - patientPays : 0;
  const nearExpiryLimit = settings ? addDays(todayLocal(), settings.expiryBucketDays.d30) : null;

  // A ref, not the `saving` state: F12 held down repeats faster than React
  // re-renders, and the state check let the same cart be charged twice.
  const submitLock = useRef(false);

  async function checkout() {
    if (saving || submitLock.current) return;
    setError(null);
    if (!warehouseId) return setError(ar.sales.errors.noWarehouse);
    if (cart.length === 0) return setError(ar.sales.errors.noLines);
    if (cart.some((l) => parseQty(l.qty) <= 0)) return setError(ar.sales.errors.invalidQty);
    const fractional = cart.find((l) => lineBase(l) === null);
    if (fractional) {
      return setError(
        ar.errors['sale.qtyNotWhole'].replace('{qty}', fractional.qty).replace('{unit}', unitOf(fractional).nameAr)
      );
    }
    const badDiscount = cart.find((l) => {
      const text = l.discountEgp.trim();
      if (!text) return false;
      try {
        const d = toPiastres(text);
        return d < 0 || d > lineMoney(l).before;
      } catch {
        return true;
      }
    });
    if (badDiscount) {
      return setError(ar.sales.errors.discountInvalid.replace('{item}', badDiscount.item.nameAr));
    }
    if (company?.requiresApprovalNo && !insurance?.approvalNo.trim()) {
      return setError(ar.errors['insurance.approvalRequired'].replace('{company}', company.nameAr));
    }
    if (invoiceType === 'cash' && tendered !== null && tendered < patientPays) {
      return setError(ar.sales.errors.insufficientPaid);
    }
    if (invoiceType === 'credit' && !customer) return setError(ar.sales.errors.noCustomer);
    if (!window.api) return setError(ar.status.noBridge);
    // BR-7: a scheduled item cannot leave without a prescription — ask now.
    if (cart.some((l) => l.item.scheduleClass !== 'none') && !prescription) {
      setAskPrescription(true);
      return;
    }

    // Only the lines being paid for are cleared afterwards — an item scanned
    // while the save is in flight stays in the cart for the next customer.
    const submitted = new Set(cart.map((l) => l.key));
    submitLock.current = true;
    setSaving(true);
    try {
      const invoiceId = await window.api.sales.checkout(invoiceInput());
      const invoice = await window.api.sales.get(invoiceId);
      showToast(ar.sales.confirmed.replace('{serial}', String(invoice?.serial ?? invoiceId)));
      setLastInvoiceId(invoiceId);
      setCart((prev) => prev.filter((l) => !submitted.has(l.key)));
      setTendered(null);
      setCustomer(null);
      setPrescription(null);
      setInsurance(null);
      setInvoiceType('cash');
      searchRef.current?.focus();
      // Printing happens after the sale committed and never blocks the till
      // (rule 10): a printer fault is a toast, the sale is already safe.
      if (settings?.printer.mode !== 'none' && settings?.printer.autoPrint) {
        window.api.print.receipt(invoiceId).catch((err) => {
          if (errorCode(err) !== 'print.notConfigured') showToast(ar.till.printFailed, 'error');
        });
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }

  function invoiceInput() {
    return {
      warehouseId: warehouseId!,
      invoiceType,
      customerId: invoiceType === 'credit' ? customer!.id : null,
      cashTendered: invoiceType === 'cash' ? tendered : null,
      insurance: insurance
        ? { companyId: insurance.companyId, memberNo: insurance.memberNo.trim() || null, approvalNo: insurance.approvalNo.trim() || null }
        : null,
      prescription: cart.some((l) => l.item.scheduleClass !== 'none') ? prescription : null,
      lines: cart.map((l, i) => ({
        lineNo: i + 1,
        itemId: l.item.id,
        unitId: l.unitId,
        qtyInUnit: parseQty(l.qty),
        discountAmt: lineMoney(l).discount,
      })),
    };
  }

  /** F8 — park the invoice while the customer fetches money; resume it later. */
  async function hold() {
    if (!window.api || !warehouseId || cart.length === 0 || saving || submitLock.current) return;
    setError(null);
    submitLock.current = true;
    setSaving(true);
    try {
      const id = await window.api.sales.hold(invoiceInput());
      const invoice = await window.api.sales.get(id);
      showToast(ar.till.heldSaved.replace('{serial}', String(invoice?.serial ?? id)));
      setCart([]);
      setTendered(null);
      setCustomer(null);
      setPrescription(null);
      setInsurance(null);
      setInvoiceType('cash');
    } catch (err) {
      setError(errorText(err));
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  }

  async function showHeld() {
    if (!window.api || !warehouseId) return;
    setHeldList(await window.api.sales.held(warehouseId));
  }

  async function resume(row: HeldInvoiceRow) {
    if (!window.api) return;
    setHeldList(null);
    setError(null);
    try {
      const held = await window.api.sales.resume(row.id);
      const lines: CartLine[] = [];
      for (const l of held.lines) {
        const item = await window.api.items.get(l.itemId);
        if (!item) continue;
        const line = await buildLine(item, l);
        if (line) lines.push(line);
      }
      setCart((prev) => [...prev, ...lines]);
      setInvoiceType(held.invoiceType);
      if (held.customerId) {
        const c = await window.api.customers.get(held.customerId);
        if (c) setCustomer(c);
      }
      if (held.prescription) setPrescription(held.prescription);
      if (held.insurance) {
        await chooseCompany(held.insurance.companyId);
        setInsurance({
          companyId: held.insurance.companyId,
          memberNo: held.insurance.memberNo ?? '',
          approvalNo: held.insurance.approvalNo ?? '',
        });
      }
    } catch (err) {
      setError(errorText(err));
    }
  }

  /** F3 — items with the same active ingredient: in stock first, then cheapest. */
  async function showAlternatives() {
    if (!window.api || !warehouseId) return;
    const target = results[0] ?? cart[cart.length - 1]?.item;
    if (!target) return;
    setAlternatives({ item: target, rows: await window.api.items.alternatives(target.id, warehouseId) });
  }

  useEffect(() => {
    if (prescription && continueAfterRx.current) {
      continueAfterRx.current = false;
      void checkout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prescription]);

  // Latest handlers without re-binding the listener on every keystroke.
  async function printLast() {
    if (!lastInvoiceId) return;
    try {
      await window.api!.print.document('sale', lastInvoiceId);
    } catch (err) {
      setError(errorText(err));
    }
  }

  const actions = useRef({ checkout, selectInvoiceType, hold, showAlternatives, printLast });
  actions.current = { checkout, selectInvoiceType, hold, showAlternatives, printLast };
  const typeRef = useRef(invoiceType);
  typeRef.current = invoiceType;

  // Only the invoice on screen answers F-keys — other open invoices stay put.
  usePageShortcuts(
    () => [
      { id: 'pay', code: 'F12', run: () => void actions.current.checkout() },
      { id: 'search', code: 'F2', run: () => searchRef.current?.focus() },
      { id: 'alternatives', code: 'F3', run: () => void actions.current.showAlternatives() },
      { id: 'hold', code: 'F8', run: () => void actions.current.hold() },
      { id: 'printLast', code: 'KeyP', ctrl: true, run: () => void actions.current.printLast() },
      {
        id: 'type',
        code: 'F4',
        run: () => actions.current.selectInvoiceType(typeRef.current === 'cash' ? 'credit' : 'cash'),
      },
    ],
    []
  );
  // A cart with items is unsaved work: closing this page asks first.
  usePageDirty(cart.length > 0);

  return (
    <div className="pos">
      <div className="pos__search-bar">
        <SearchInput
          ref={searchRef}
          className="field pos__search"
          placeholder={ar.sales.itemSearch}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.code === 'Enter' || e.code === 'NumpadEnter') {
              if (results[0]) void addItemToCart(results[0]);
            } else if (e.code === 'Escape') {
              setQuery('');
              setResults([]);
            }
          }}
        />
        <span className="pos__warehouse">
          {ar.sales.warehouse}: {warehouseName}
        </span>
        {results.length > 0 && (
          <ul className="autocomplete autocomplete--pos">
            {results.map((it) => (
              <li key={it.id}>
                <button type="button" onClick={() => void addItemToCart(it)}>
                  <span>{it.nameAr}</span>
                  {it.publicPrice !== null && <span dir="ltr">{fromPiastres(it.publicPrice)}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="btn-row" style={{ marginBlockStart: 0 }}>
        <p className="hint" style={{ margin: 0 }}>{ar.till.shortcuts}</p>
        <button type="button" className="btn btn--sm" onClick={() => void showHeld()}>
          {ar.till.held}
        </button>
        <button type="button" className="btn btn--sm" disabled={!lastInvoiceId} onClick={() => void printLast()}>
          {ar.print.lastSale} (Ctrl+P)
        </button>
        {prescription && <span className="badge badge--success">{ar.prescription.attached}</span>}
      </div>
      {error && <div className="alert alert--error">{error}</div>}

      {cart.length === 0 ? (
        <EmptyState title={ar.sales.emptyCart} />
      ) : (
        <div className="table-wrap"><table className="datatable">
          <thead>
            <tr>
              <th>{ar.items.fields.nameAr}</th>
              <th>{ar.sales.unit}</th>
              <th>{ar.sales.qty}</th>
              <th>{ar.sales.unitPrice}</th>
              <th>{ar.sales.discount}</th>
              <th>{ar.sales.lineTotal}</th>
              <th>{ar.sales.available}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cart.map((l) => {
              const m = lineMoney(l);
              const base = lineBase(l);
              const short = base !== null && base > l.availableBase;
              const nearExpiry = l.nearestExpiry && nearExpiryLimit && l.nearestExpiry <= nearExpiryLimit;
              return (
                <tr key={l.key}>
                  <td>
                    <div>{l.item.nameAr}</div>
                    <div className="badges">
                      {l.requiresPrescription && <span className="badge badge--warning">{ar.sales.warnings.prescription}</span>}
                      {l.item.scheduleClass !== 'none' && <span className="badge badge--error">{ar.sales.warnings.controlled}</span>}
                      {l.item.storageCondition !== 'room' && <span className="badge badge--muted">{ar.sales.warnings.fridge}</span>}
                      {nearExpiry && (
                        <span className="badge badge--warning">
                          {ar.sales.warnings.nearExpiry.replace('{date}', l.nearestExpiry!)}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      className="field field--sm"
                      value={l.unitId}
                      onChange={(e) => updateLine(l.key, { unitId: Number(e.target.value) })}
                    >
                      {l.units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nameAr}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className={base === null || short ? 'field field--sm field--invalid' : 'field field--sm'}
                      dir="ltr"
                      inputMode="decimal"
                      value={l.qty}
                      onChange={(e) => updateLine(l.key, { qty: toAsciiDigits(e.target.value) })}
                    />
                  </td>
                  <td dir="ltr">{fromPiastres(m.unit.salePrice)}</td>
                  <td>
                    <input
                      className="field field--xs"
                      dir="ltr"
                      inputMode="decimal"
                      placeholder="0"
                      value={l.discountEgp}
                      onChange={(e) => updateLine(l.key, { discountEgp: toAsciiDigits(e.target.value) })}
                    />
                  </td>
                  <td dir="ltr" className="strong">{fromPiastres(m.after)}</td>
                  <td dir="ltr" className={short ? 'text-bad' : 'muted'}>
                    {l.availableBase}
                  </td>
                  <td>
                    <button type="button" className="btn btn--danger btn--sm" onClick={() => removeLine(l.key)}>
                      {ar.sales.remove}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}

      <div className="pos__footer">
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.sales.invoiceType}</span>
            <select
              className="field"
              value={insurance ? 'insurance' : invoiceType}
              onChange={(e) => selectInvoiceType(e.target.value as 'cash' | 'credit' | 'insurance')}
            >
              <option value="cash">{ar.sales.cash}</option>
              <option value="credit">{ar.sales.credit}</option>
              {companies.length > 0 && <option value="insurance">{ar.insurance.saleType}</option>}
            </select>
          </label>
          {insurance && (
            <>
              <label className="formfield">
                <span className="formfield__label">{ar.insurance.company}</span>
                <select className="field" value={insurance.companyId} onChange={(e) => void chooseCompany(Number(e.target.value))}>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr} ({c.coveragePct}%)
                    </option>
                  ))}
                </select>
              </label>
              <label className="formfield">
                <span className="formfield__label">{ar.insurance.memberNo}</span>
                <input
                  className="field"
                  dir="ltr"
                  value={insurance.memberNo}
                  onChange={(e) => setInsurance({ ...insurance, memberNo: toAsciiDigits(e.target.value) })}
                />
              </label>
              <label className="formfield">
                <span className="formfield__label">
                  {ar.insurance.approvalNo}
                  {company?.requiresApprovalNo ? <span className="req"> *</span> : null}
                </span>
                <input
                  className="field"
                  dir="ltr"
                  value={insurance.approvalNo}
                  onChange={(e) => setInsurance({ ...insurance, approvalNo: toAsciiDigits(e.target.value) })}
                />
              </label>
            </>
          )}
          {invoiceType === 'cash' && (
            <label className="formfield">
              <span className="formfield__label">{ar.sales.tendered}</span>
              <MoneyInput value={tendered} onChange={setTendered} placeholder={ar.sales.tenderedHint} />
            </label>
          )}
          {invoiceType === 'credit' && (
            <label className="formfield">
              <span className="formfield__label">
                {ar.sales.customer}
                <span className="req"> *</span>
              </span>
              {customer ? (
                <div className="pos__customer-picked">
                  <span>
                    {customer.name} <span dir="ltr">#{customer.code}</span>
                  </span>
                  <button type="button" className="btn btn--sm" onClick={() => setCustomer(null)}>
                    {ar.sales.changeCustomer}
                  </button>
                </div>
              ) : (
                <div className="field-wrap">
                  <SearchInput
                    className="field"
                    placeholder={ar.sales.customerSearch}
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.code === 'Enter' || e.code === 'NumpadEnter') && customerResults[0]) selectCustomer(customerResults[0]);
                    }}
                  />
                  {customerResults.length > 0 && (
                    <ul className="autocomplete autocomplete--offset">
                      {customerResults.map((c) => (
                        <li key={c.id}>
                          <button type="button" onClick={() => selectCustomer(c)}>
                            <span>{c.name}</span> <span dir="ltr">#{c.code}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </label>
          )}
        </div>

        <div className="stats">
          <Stat label={ar.sales.itemCount} value={String(cart.length)} neutral />
          <Stat label={ar.sales.total} value={fromPiastres(totals.total)} good={!insurance} neutral={Boolean(insurance)} />
          {insurance && <Stat label={ar.insurance.companyShare} value={fromPiastres(insuranceShare)} neutral />}
          {insurance && <Stat label={ar.insurance.patientPays} value={fromPiastres(patientPays)} good />}
          {invoiceType === 'cash' && tendered !== null && (
            <Stat label={ar.sales.change} value={fromPiastres(Math.max(change, 0))} bad={change < 0} neutral={change >= 0} />
          )}
        </div>

        <div className="btn-row" style={{ marginBlockStart: 0 }}>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void checkout()}
            disabled={saving || cart.length === 0 || (invoiceType === 'credit' && !customer)}
          >
            {saving ? ar.sales.paying : invoiceType === 'cash' ? ar.sales.confirmCash : ar.sales.confirmCredit} (F12)
          </button>
          <button type="button" className="btn" disabled={saving || cart.length === 0} onClick={() => void hold()}>
            {ar.till.hold}
          </button>
          <button type="button" className="btn" disabled={!results[0] && cart.length === 0} onClick={() => void showAlternatives()}>
            {ar.till.alternatives}
          </button>
        </div>
      </div>

      {askPrescription && (
        <PrescriptionDialog
          initial={prescription}
          onCancel={() => setAskPrescription(false)}
          onSubmit={(p) => {
            setPrescription(p);
            setAskPrescription(false);
            continueAfterRx.current = true;
          }}
        />
      )}

      {alternatives && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onKeyDown={(e) => e.code === 'Escape' && setAlternatives(null)}>
          <div className="modal modal--wide panel stack">
            <h2 className="section-heading">{ar.till.alternativesTitle.replace('{item}', alternatives.item.nameAr)}</h2>
            {alternatives.rows.length === 0 ? (
              <p className="muted">{ar.till.alternativesEmpty}</p>
            ) : (
              <div className="table-wrap"><table className="datatable">
                <thead>
                  <tr>
                    <th>{ar.items.fields.nameAr}</th>
                    <th>{ar.items.fields.publicPrice}</th>
                    <th>{ar.sales.available}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {alternatives.rows.map((a, i) => (
                    <tr key={a.itemId}>
                      <td>
                        {a.nameAr}
                        {a.shelfLocation && <span className="muted small"> · {a.shelfLocation}</span>}
                      </td>
                      <td dir="ltr">{a.publicPrice != null ? fromPiastres(a.publicPrice) : '—'}</td>
                      <td dir="ltr" className={a.qtyOnHand > 0 ? 'strong' : 'muted'}>{a.qtyOnHand}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          autoFocus={i === 0}
                          disabled={a.qtyOnHand <= 0}
                          onClick={async () => {
                            const item = await window.api!.items.get(a.itemId);
                            if (item) await addItemToCart(item);
                          }}
                        >
                          {ar.till.add}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
            <div className="btn-row">
              <button type="button" className="btn" autoFocus={alternatives.rows.length === 0} onClick={() => setAlternatives(null)}>
                {ar.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {heldList && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onKeyDown={(e) => e.code === 'Escape' && setHeldList(null)}>
          <div className="modal panel stack">
            <h2 className="section-heading">{ar.till.held}</h2>
            {heldList.length === 0 ? (
              <p className="muted">{ar.till.heldEmpty}</p>
            ) : (
              <div className="table-wrap"><table className="datatable">
                <tbody>
                  {heldList.map((h, i) => (
                    <tr key={h.id}>
                      <td dir="ltr">#{h.serial}</td>
                      <td dir="ltr">{h.heldAt.slice(11, 16)}</td>
                      <td>{h.customerName ?? ar.invoices.walkIn}</td>
                      <td dir="ltr">{fromPiastres(h.total)}</td>
                      <td>
                        <button type="button" className="btn btn--primary btn--sm" autoFocus={i === 0} onClick={() => void resume(h)}>
                          {ar.till.resume}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
            <div className="btn-row">
              <button type="button" className="btn" onClick={() => setHeldList(null)}>
                {ar.common.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
