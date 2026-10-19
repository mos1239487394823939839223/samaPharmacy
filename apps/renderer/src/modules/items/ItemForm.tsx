/**
 * اضافة صنف — four tabs, per blueprint §1.4.
 *
 * Ctrl+Shift+S saves and ESC cancels (blueprint §1.2). Both read event.code
 * (rule 4). Every string comes from the i18n file.
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemDetail, ItemInput } from '@pharmacy/shared';
import { boxFactorOf, fromPiastres, maxUnitPrice, toAsciiDigits, validateUnitSet } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { attachShortcuts, formatShortcut } from '../../lib/shortcuts';
import { useBarcodeScanner, isValidEan, classifyBarcode } from '../../hardware/scanner';
import { loadScannerConfig } from '../../hardware/config';
import { errorText } from '../../lib/errors';
import { usePageShortcuts } from '../../lib/workspace';

type Tab = 'basic' | 'pricing' | 'supplier' | 'settings';

interface UnitRow {
  /** Set for a unit loaded from an existing item — carried through to save
      so the backend updates this row in place rather than recreating it
      (a fresh row would break every past invoice line referencing it). */
  id?: number;
  nameAr: string;
  factor: string;
  salePrice: number | null;
  isBase: boolean;
  isDefaultSale: boolean;
  /** Price follows the box price automatically until the user types one. */
  autoPrice?: boolean;
  /** Typing a name not in the predefined list. */
  customName?: boolean;
}

/** Predefined unit names (i18n), as plain strings. */
const UNIT_NAMES: readonly string[] = ar.items.unitNames;
/** Marker option that switches a unit name to free typing. */
const OTHER = '__other__';
/** Names older versions stored that are kept as-is (shown, never forced into "other"). */
const LEGACY_NAMES = new Set(['وحدة', 'علبه']);

/** Name of the smallest unit, for labels like «عدد الأقراص فيها». */
function BASE_NAME(units: UnitRow[]): string {
  return units.find((u) => u.isBase)?.nameAr || UNIT_NAMES[2]!;
}

/** Suggest the next unit up: علبة → شريط → … skipping names already used. */
function nextUnitName(units: UnitRow[]): string {
  const used = new Set(units.map((u) => u.nameAr));
  return UNIT_NAMES.find((n) => !used.has(n)) ?? '';
}

interface Props {
  existing?: ItemDetail | null;
  showBadges: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

const SAVE = { code: 'KeyS', ctrl: true, shift: true } as const;

export function ItemForm({ existing, showBadges, onSaved, onCancel }: Props) {
  const [tab, setTab] = useState<Tab>('basic');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nameAr, setNameAr] = useState(existing?.nameAr ?? '');
  const [nameEn, setNameEn] = useState(existing?.nameEn ?? '');
  const [internationalCode, setInternationalCode] = useState(existing?.internationalCode ?? '');
  const [origin, setOrigin] = useState<'local' | 'imported'>((existing?.origin as 'local') ?? 'local');
  const [itemNature, setItemNature] = useState(existing?.itemNature ?? '');
  const [scientificName, setScientificName] = useState(existing?.scientificName ?? '');
  const [mainIngredientPct, setMainIngredientPct] = useState(
    existing?.mainIngredientPct != null ? String(existing.mainIngredientPct) : ''
  );
  const [noExpiry, setNoExpiry] = useState(Boolean(existing?.noExpiry));
  const [requiresPrescription, setRequiresPrescription] = useState(Boolean(existing?.requiresPrescription));
  const [scheduleClass, setScheduleClass] = useState<
    'none' | 'table1' | 'table2' | 'table3'
  >((existing?.scheduleClass as 'none') ?? 'none');
  const [storageCondition, setStorageCondition] = useState<'room' | 'fridge' | 'freezer'>(
    (existing?.storageCondition as 'room') ?? 'room'
  );
  const [shelfLocation, setShelfLocation] = useState(existing?.shelfLocation ?? '');
  const [publicPrice, setPublicPrice] = useState<number | null>(existing?.publicPrice ?? null);
  const [minStock, setMinStock] = useState(existing?.minStock != null ? String(existing.minStock) : '0');
  const [maxStock, setMaxStock] = useState(existing?.maxStock != null ? String(existing.maxStock) : '');

  const [barcodes, setBarcodes] = useState<string[]>(
    existing?.barcodes?.length ? existing.barcodes : ['']
  );

  // Units as loaded — with any price above its share of the box (BR-4,
  // decision D9) corrected up front. Older data priced the tablet like the
  // whole box, which made EVERY later edit of the item fail; the corrections
  // are listed in `priceNotice` so the pharmacist sees exactly what changed.
  const [initial] = useState(() => {
    // Retired units (allow_sale = 0) stay in the database for history but
    // are not shown — re-submitting them would silently re-enable them.
    const rows: UnitRow[] = existing?.units?.some((u) => u.allowSale)
      ? existing.units.filter((u) => u.allowSale).map((u) => ({
          id: u.id,
          nameAr: u.nameAr,
          factor: String(u.factor),
          salePrice: u.salePrice,
          isBase: Boolean(u.isBase),
          isDefaultSale: Boolean(u.isDefaultSale),
        }))
      : [{ nameAr: UNIT_NAMES[0]!, factor: '1', salePrice: null, isBase: true, isDefaultSale: true, autoPrice: true }];
    for (const r of rows) r.customName = Boolean(r.nameAr) && !UNIT_NAMES.includes(r.nameAr) && !LEGACY_NAMES.has(r.nameAr);
    const corrections: string[] = [];
    const pub = existing?.publicPrice ?? null;
    if (pub != null) {
      const box = boxFactorOf(rows.map((r) => ({ factor: Number(r.factor) || 1 })));
      for (const r of rows) {
        const cap = maxUnitPrice(pub, box, Number(r.factor) || 1);
        if (r.salePrice != null && r.salePrice > cap) {
          corrections.push(`${r.nameAr}: ${fromPiastres(r.salePrice)} ← ${fromPiastres(cap)}`);
          r.salePrice = cap;
        }
        // A price that is exactly the unit's share keeps following the box price.
        r.autoPrice = r.salePrice == null || r.salePrice === cap;
      }
    }
    return { rows, corrections };
  });
  const [units, setUnits] = useState<UnitRow[]>(initial.rows);
  const [priceNotice, setPriceNotice] = useState<string[]>(initial.corrections);

  /** Highest legal price for a unit row given the current box price (null = no public price set). */
  function capFor(u: UnitRow): number | null {
    if (publicPrice == null) return null;
    const box = boxFactorOf(units.map((x) => ({ factor: Number(x.factor) || 1 })));
    return maxUnitPrice(publicPrice, box, Number(u.factor) || 1);
  }

  /** Fill every unit with its share of the box price — the box itself gets the full price. */
  function fillUnitPrices() {
    if (publicPrice == null) return;
    const box = boxFactorOf(units.map((x) => ({ factor: Number(x.factor) || 1 })));
    setUnits(units.map((u) => ({ ...u, salePrice: maxUnitPrice(publicPrice, box, Number(u.factor) || 1), autoPrice: true })));
    setPriceNotice([]);
  }

  // Units left on automatic pricing follow the box price and the factors:
  // change the box price from 100 to 120 and a strip of 10 (box of 20)
  // moves from 50 to 60 by itself. A typed price is never overwritten.
  const factorsKey = units.map((u) => u.factor).join(',');
  useEffect(() => {
    if (publicPrice == null) return;
    const box = boxFactorOf(units.map((x) => ({ factor: Number(x.factor) || 1 })));
    let changed = false;
    const next = units.map((u) => {
      if (!u.autoPrice) return u;
      const price = maxUnitPrice(publicPrice, box, Number(u.factor) || 1);
      if (price === u.salePrice) return u;
      changed = true;
      return { ...u, salePrice: price };
    });
    if (changed) setUnits(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicPrice, factorsKey]);

  const firstFieldRef = useRef<HTMLInputElement>(null);
  useEffect(() => firstFieldRef.current?.focus(), []);

  const [scanNotice, setScanNotice] = useState<string | null>(null);

  // Hardware doc §1.4 routing: on the item form, a scan fills the barcode
  // table. Keep the latest barcode list visible to the handler without
  // re-attaching the keyboard listener on every keystroke.
  const barcodesRef = useRef(barcodes);
  barcodesRef.current = barcodes;

  useBarcodeScanner(
    (event) => {
      const code = event.code;
      // Scanning while the international-code field has focus fills that field.
      if ((document.activeElement as HTMLElement | null)?.dataset?.scanTarget === 'international') {
        setInternationalCode(code);
        setScanNotice(ar.items.scan.internationalSet.replace('{code}', code));
        return;
      }
      const current = barcodesRef.current;

      if (current.some((b) => b.trim() === code)) {
        setScanNotice(ar.items.scan.duplicate.replace('{code}', code));
        return;
      }

      // Fill the first empty row, otherwise append one.
      const emptyIndex = current.findIndex((b) => b.trim() === '');
      const next =
        emptyIndex >= 0
          ? current.map((b, i) => (i === emptyIndex ? code : b))
          : [...current, code];

      setBarcodes(next);
      setTab('basic');

      // A failed EAN check digit usually means a misread, not a missing item
      // (hardware doc §1.5). Warn rather than reject — internal codes and
      // Code128 are legitimately not EAN.
      const kind = classifyBarcode(code);
      if ((kind === 'ean13' || kind === 'ean8') && !isValidEan(code)) {
        setScanNotice(ar.items.scan.badCheckDigit.replace('{code}', code));
      } else {
        setScanNotice(ar.items.scan.added.replace('{code}', code));
      }
    },
    {
      config: loadScannerConfig(),
      // Timing mode cannot tell a scan from fast typing in a text field, and a
      // barcode landing in the drug-name field is worse than a missed scan.
      // Suppress while a non-barcode text input holds focus.
      shouldIgnore: () => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return false;
        if (el.dataset?.scanTarget === 'barcode' || el.dataset?.scanTarget === 'international') return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      },
      onGuard: (guard, detail) => {
        // A non-zero contamination counter means event.key is leaking in
        // somewhere upstream — surface it rather than relying on the repair.
        console.warn(`[scanner:${guard}] ${detail}`);
      },
    }
  );

  // Keep the latest state visible to the shortcut handler without re-attaching
  // the listener on every keystroke.
  const submitRef = useRef<() => void>(() => {});
  const cancelRef = useRef<() => void>(onCancel);
  cancelRef.current = onCancel;

  usePageShortcuts(
    () => [
      { id: 'save', ...SAVE, run: () => submitRef.current() },
      { id: 'cancel', code: 'Escape', run: () => cancelRef.current() },
    ],
    []
  );

  function buildInput(): ItemInput {
    const cleanBarcodes = barcodes.map((b) => b.trim()).filter(Boolean);
    const cleanUnits = units
      .filter((u) => u.nameAr.trim() !== '')
      .map((u) => ({
        id: u.id,
        nameAr: u.nameAr.trim(),
        factor: Number(u.factor),
        salePrice: u.salePrice ?? 0,
        isBase: u.isBase,
        isDefaultSale: u.isDefaultSale,
      }));

    return {
      nameAr: nameAr.trim(),
      nameEn: nameEn.trim() || null,
      internationalCode: internationalCode.trim() || null,
      origin,
      itemNature: itemNature.trim() || null,
      scientificName: scientificName.trim() || null,
      mainIngredientPct: mainIngredientPct === '' ? null : Number(mainIngredientPct),
      scheduleClass,
      storageCondition,
      noExpiry,
      requiresPrescription,
      shelfLocation: shelfLocation.trim() || null,
      publicPrice,
      minStock: minStock === '' ? 0 : Number(minStock),
      maxStock: maxStock === '' ? null : Number(maxStock),
      barcodes: cleanBarcodes,
      units: cleanUnits,
    };
  }

  function validate(input: ItemInput): string | null {
    if (!input.nameAr) return ar.items.errors.nameRequired;

    if (
      input.mainIngredientPct != null &&
      (!Number.isFinite(input.mainIngredientPct) || input.mainIngredientPct < 0 || input.mainIngredientPct > 100)
    ) {
      return ar.items.errors.mainIngredientPctInvalid;
    }

    const wholeOk = (n: number | null | undefined) => n == null || (Number.isInteger(n) && n >= 0);
    if (!wholeOk(input.minStock) || !wholeOk(input.maxStock)) return ar.items.errors.stockLevelInvalid;

    // An empty price became 0 — the till then sold that unit for nothing.
    const unpriced = units.find((u) => u.nameAr.trim() !== '' && (u.salePrice === null || u.salePrice <= 0));
    if (unpriced) return ar.items.errors.unitPriceRequired.replace('{unit}', unpriced.nameAr.trim());

    if (input.maxStock != null && input.maxStock < (input.minStock ?? 0)) {
      return ar.items.errors.maxStockBelowMin;
    }

    if (input.barcodes && input.barcodes.length > 0) {
      const seen = new Set<string>();
      for (const b of input.barcodes) {
        if (seen.has(b)) return ar.items.errors.duplicateBarcodeInForm;
        seen.add(b);
      }
    }

    if (input.units && input.units.length > 0) {
      const unitErrors = validateUnitSet(
        input.units.map((u, i) => ({
          id: i,
          nameAr: u.nameAr,
          factor: u.factor,
          isBase: u.isBase,
        }))
      );
      if (unitErrors.length > 0) return describeUnitError(unitErrors[0]!);

      // BR-4 with decision D9: the public price is the BOX price (the
      // largest unit). Each unit is capped at its share of it — a strip of
      // 10 from a 100.00 box of 20 at most 50.00. Same rule the server applies.
      if (input.publicPrice != null) {
        const box = boxFactorOf(input.units);
        for (const u of input.units) {
          const cap = maxUnitPrice(input.publicPrice, box, u.factor);
          if (u.salePrice > cap) {
            return ar.items.errors.unitPriceAboveCap.replace('{unit}', u.nameAr).replace('{cap}', fromPiastres(cap));
          }
        }
      }
    }

    return null;
  }

  /** Translates a validateUnitSet message (packages/core/src/units.ts) to the
      matching Arabic string, so the form surfaces the specific failure
      instead of one collapsed "define a base unit" message that misleads
      when the real problem is a duplicate name or a bad factor. */
  function describeUnitError(message: string): string {
    if (message.startsWith('Duplicate unit name')) {
      const name = message.match(/"([^"]*)"/)?.[1] ?? '';
      return ar.items.errors.duplicateUnitName.replace('{name}', name);
    }
    if (message.includes('invalid factor')) {
      const name = message.match(/"([^"]*)"/)?.[1] ?? '';
      return ar.items.errors.invalidUnitFactor.replace('{name}', name);
    }
    if (message.startsWith('Base unit must have factor 1')) {
      return ar.items.errors.baseFactorOne;
    }
    if (/base units defined/.test(message)) {
      return ar.items.errors.multipleBaseUnits;
    }
    return ar.items.errors.needBaseUnit;
  }

  async function submit() {
    if (saving) return;
    setError(null);

    const input = buildInput();
    const problem = validate(input);
    if (problem) {
      setError(problem);
      // Price and unit problems live on the pricing tab — show it.
      if (
        problem.includes(ar.items.errors.unitPriceAboveCapMarker) ||
        units.some((u) => !u.nameAr.trim() || u.salePrice === null || u.salePrice <= 0)
      ) {
        setTab('pricing');
      }
      return;
    }

    setSaving(true);
    try {
      if (!window.api) throw new Error(ar.status.noBridge);
      if (existing) await window.api.items.update(existing.id, input);
      else await window.api.items.create(input);
      onSaved();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }
  submitRef.current = submit;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'basic', label: ar.items.tabs.basic },
    { id: 'pricing', label: ar.items.tabs.pricing },
    { id: 'supplier', label: ar.items.tabs.supplier },
    { id: 'settings', label: ar.items.tabs.settings },
  ];

  return (
    <form
      className="item-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="item-form__toolbar">
        <button type="submit" className="btn btn--primary" disabled={saving}>
          <span>{ar.items.actions.save}</span>
          {showBadges && (
            <span className="btn__badge" dir="ltr">
              {formatShortcut(SAVE)}
            </span>
          )}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          <span>{ar.items.actions.cancel}</span>
          {showBadges && (
            <span className="btn__badge btn__badge--muted" dir="ltr">
              Esc
            </span>
          )}
        </button>
        {existing && (
          <span className="item-form__code" dir="ltr">
            {ar.items.fields.code}: {existing.code}
          </span>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {priceNotice.length > 0 && tab !== 'pricing' && (
        <div className="alert alert--info">
          <span>{ar.items.pricing.correctedBanner.replace('{count}', String(priceNotice.length))}</span>
          <button type="button" className="btn btn--sm" onClick={() => setTab('pricing')}>
            {ar.items.pricing.review}
          </button>
        </div>
      )}
      {scanNotice && (
        <div className="alert alert--info" role="status">
          {scanNotice}
          <button
            type="button"
            className="alert__close"
            onClick={() => setScanNotice(null)}
            aria-label={ar.items.actions.cancel}
          >
            ×
          </button>
        </div>
      )}

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'tab tab--active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="panel">
        {tab === 'basic' && (
          <>
            <div className="grid2">
              <Field label={ar.items.fields.nameAr} required>
                <input
                  ref={firstFieldRef}
                  className="field"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                />
              </Field>
              <Field label={ar.items.fields.nameEn}>
                <input
                  className="field"
                  dir="ltr"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                />
              </Field>
              <Field label={ar.items.fields.internationalCode}>
                <input
                  className="field"
                  dir="ltr"
                  inputMode="numeric"
                  // A legitimate scan destination: scanning the box fills it.
                  data-scan-target="international"
                  placeholder={ar.items.fields.internationalCodeHint}
                  value={internationalCode}
                  // Arabic-Indic digits typed on an Arabic layout would never
                  // match a scanned code — always store ASCII, no spaces.
                  onChange={(e) => setInternationalCode(toAsciiDigits(e.target.value).replace(/\s+/g, ''))}
                />
              </Field>
              <Field label={ar.items.fields.origin}>
                <select
                  className="field"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value as 'local' | 'imported')}
                >
                  <option value="local">{ar.items.fields.originLocal}</option>
                  <option value="imported">{ar.items.fields.originImported}</option>
                </select>
              </Field>
              <Field label={ar.items.fields.itemNature}>
                <input
                  className="field"
                  value={itemNature}
                  onChange={(e) => setItemNature(e.target.value)}
                />
              </Field>
            </div>

            <fieldset className="fieldset">
              <legend>{ar.items.fields.scientificData}</legend>
              <div className="grid2">
                <Field label={ar.items.fields.scientificName}>
                  <input
                    className="field"
                    dir="ltr"
                    value={scientificName}
                    onChange={(e) => setScientificName(e.target.value)}
                  />
                </Field>
                <Field label={ar.items.fields.mainIngredientPct}>
                  <input
                    className="field"
                    dir="ltr"
                    inputMode="decimal"
                    value={mainIngredientPct}
                    onChange={(e) => setMainIngredientPct(toAsciiDigits(e.target.value))}
                  />
                </Field>
              </div>
              <label className="check">
                <input
                  type="checkbox"
                  checked={noExpiry}
                  onChange={(e) => setNoExpiry(e.target.checked)}
                />
                <span>{ar.items.fields.noExpiry}</span>
              </label>
            </fieldset>

            <RepeatingList
              legend={ar.items.fields.barcodes}
              hint={ar.items.scan.hint}
              rows={barcodes}
              onAdd={() => setBarcodes([...barcodes, ''])}
              onRemove={(i) => setBarcodes(barcodes.filter((_, idx) => idx !== i))}
              render={(value, i) => (
                <input
                  className="field"
                  dir="ltr"
                  // Marks this input as a legitimate scan destination, so the
                  // scanner is not suppressed while it holds focus.
                  data-scan-target="barcode"
                  value={value}
                  placeholder={ar.items.fields.barcode}
                  onChange={(e) => {
                    const next = [...barcodes];
                    next[i] = e.target.value;
                    setBarcodes(next);
                  }}
                />
              )}
            />
          </>
        )}

        {tab === 'pricing' && (
          <>
            <div className="grid2">
              <Field label={ar.items.fields.publicPrice}>
                <MoneyInput value={publicPrice} onChange={setPublicPrice} />
              </Field>
            </div>

            {priceNotice.length > 0 && (
              <div className="alert alert--info">
                <div>
                  <strong>{ar.items.pricing.correctedTitle}</strong>
                  <ul className="small">
                    {priceNotice.map((n) => (
                      <li key={n} dir="auto">
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <p className="hint">{ar.items.pricing.rule}</p>

            <fieldset className="fieldset">
              <legend>{ar.items.fields.units}</legend>
              <p className="hint">{ar.items.pricing.howTo}</p>
              <div className="unit-rows">
                {units.map((u, i) => {
                  const cap = capFor(u);
                  const over = u.salePrice != null && cap != null && u.salePrice > cap;
                  const base = BASE_NAME(units);
                  const options = [...UNIT_NAMES];
                  if (u.nameAr && !u.customName && !options.includes(u.nameAr)) options.unshift(u.nameAr);
                  return (
                    <div key={i} className={u.isBase ? 'unit-row unit-row--base' : 'unit-row'}>
                      <label className="formfield">
                        <span className="formfield__label">{ar.items.fields.unitName}</span>
                        {u.customName ? (
                          <span className="unit-row__custom">
                            <input
                              className="field"
                              autoFocus={!u.nameAr}
                              placeholder={ar.items.pricing.customPlaceholder}
                              value={u.nameAr}
                              onChange={(e) => patchUnit(i, { nameAr: e.target.value })}
                            />
                            <button
                              type="button"
                              className="btn btn--sm"
                              title={ar.items.pricing.backToList}
                              onClick={() => patchUnit(i, { customName: false, nameAr: UNIT_NAMES[0]! })}
                            >
                              ↩
                            </button>
                          </span>
                        ) : (
                          <select
                            className="field"
                            value={u.nameAr}
                            onChange={(e) =>
                              e.target.value === OTHER
                                ? patchUnit(i, { customName: true, nameAr: '' })
                                : patchUnit(i, { nameAr: e.target.value })
                            }
                          >
                            {!u.nameAr && <option value="">—</option>}
                            {options.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                            <option value={OTHER}>{ar.items.pricing.other}</option>
                          </select>
                        )}
                      </label>

                      <label className="formfield">
                        <span className="formfield__label">
                          {u.isBase ? ar.items.pricing.baseUnit : ar.items.pricing.contains.replace('{base}', base)}
                        </span>
                        <input
                          className="field"
                          dir="ltr"
                          inputMode="numeric"
                          disabled={u.isBase}
                          value={u.isBase ? '1' : u.factor}
                          onChange={(e) => patchUnit(i, { factor: toAsciiDigits(e.target.value).replace(/\D/g, '') })}
                        />
                      </label>

                      <label className={over ? 'formfield cell--invalid' : 'formfield'}>
                        <span className="formfield__label">
                          {ar.items.fields.unitPrice}
                          {u.autoPrice && publicPrice != null && <span className="unit-row__auto"> · {ar.items.pricing.auto}</span>}
                        </span>
                        <MoneyInput value={u.salePrice} onChange={(v) => patchUnit(i, { salePrice: v, autoPrice: false })} />
                        <span className="hint">
                          {cap != null ? `${ar.items.pricing.maxAllowed}: ${fromPiastres(cap)}` : ar.items.pricing.needPublicPrice}
                        </span>
                      </label>

                      <div className="unit-row__flags">
                        <label className="check">
                          <input
                            type="radio"
                            name="baseUnit"
                            checked={u.isBase}
                            onChange={() => setUnits(units.map((x, idx) => ({ ...x, isBase: idx === i, factor: idx === i ? '1' : x.factor })))}
                          />
                          <span>{ar.items.fields.unitIsBase}</span>
                        </label>
                        <label className="check">
                          <input
                            type="radio"
                            name="defaultSale"
                            checked={u.isDefaultSale}
                            onChange={() => setUnits(units.map((x, idx) => ({ ...x, isDefaultSale: idx === i })))}
                          />
                          <span>{ar.items.fields.unitDefaultSale}</span>
                        </label>
                      </div>

                      <button
                        type="button"
                        className="pline__remove"
                        onClick={() => setUnits(units.filter((_, idx) => idx !== i))}
                        disabled={units.length === 1}
                        title={ar.items.actions.removeRow}
                        aria-label={ar.items.actions.removeRow}
                      >
                        ×
                      </button>

                      {!u.isBase && Number(u.factor) > 1 && (
                        <div className="unit-row__explain">
                          {ar.items.pricing.explain
                            .replace('{unit}', u.nameAr || '—')
                            .replace('{n}', u.factor)
                            .replace('{base}', base)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() =>
                    setUnits([
                      ...units,
                      {
                        nameAr: nextUnitName(units),
                        factor: '',
                        salePrice: null,
                        isBase: false,
                        isDefaultSale: false,
                        autoPrice: true,
                      },
                    ])
                  }
                >
                  + {ar.items.pricing.addUnit}
                </button>
                <button
                  type="button"
                  className="btn btn--sm"
                  disabled={publicPrice == null}
                  title={publicPrice == null ? ar.items.pricing.needPublicPrice : undefined}
                  onClick={fillUnitPrices}
                >
                  {ar.items.pricing.fill}
                </button>
              </div>
            </fieldset>
          </>
        )}

        {tab === 'supplier' && <p className="muted">{ar.shell.notImplementedHint}</p>}

        {tab === 'settings' && (
          <div className="grid2">
            <Field label={ar.items.fields.scheduleClass}>
              <select
                className="field"
                value={scheduleClass}
                onChange={(e) => setScheduleClass(e.target.value as 'none')}
              >
                <option value="none">{ar.items.schedule.none}</option>
                <option value="table1">{ar.items.schedule.table1}</option>
                <option value="table2">{ar.items.schedule.table2}</option>
                <option value="table3">{ar.items.schedule.table3}</option>
              </select>
            </Field>
            <Field label={ar.items.fields.storageCondition}>
              <select
                className="field"
                value={storageCondition}
                onChange={(e) => setStorageCondition(e.target.value as 'room')}
              >
                <option value="room">{ar.items.storage.room}</option>
                <option value="fridge">{ar.items.storage.fridge}</option>
                <option value="freezer">{ar.items.storage.freezer}</option>
              </select>
            </Field>
            <Field label={ar.items.fields.shelfLocation}>
              <input
                className="field"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
              />
            </Field>
            <Field label={ar.items.fields.minStock}>
              <input
                className="field"
                dir="ltr"
                inputMode="numeric"
                value={minStock}
                onChange={(e) => setMinStock(toAsciiDigits(e.target.value))}
              />
            </Field>
            <Field label={ar.items.fields.maxStock}>
              <input
                className="field"
                dir="ltr"
                inputMode="numeric"
                value={maxStock}
                onChange={(e) => setMaxStock(toAsciiDigits(e.target.value))}
              />
            </Field>
            <div className="span2">
              <label className="check">
                <input
                  type="checkbox"
                  checked={requiresPrescription}
                  onChange={(e) => setRequiresPrescription(e.target.checked)}
                />
                <span>{ar.items.fields.requiresPrescription}</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </form>
  );

  function patchUnit(index: number, patch: Partial<UnitRow>) {
    setUnits(units.map((u, i) => (i === index ? { ...u, ...patch } : u)));
  }
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="formfield">
      <span className="formfield__label">
        {label}
        {required && <span className="req"> *</span>}
      </span>
      {children}
    </label>
  );
}

function RepeatingList({
  legend,
  hint,
  rows,
  onAdd,
  onRemove,
  render,
}: {
  legend: string;
  hint?: string;
  rows: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  render: (value: string, index: number) => React.ReactNode;
}) {
  return (
    <fieldset className="fieldset">
      <legend>{legend}</legend>
      {hint && <p className="hint">{hint}</p>}
      {rows.map((row, i) => (
        <div className="repeat-row" key={i}>
          {render(row, i)}
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={() => onRemove(i)}
            disabled={rows.length === 1}
          >
            {ar.items.actions.removeRow}
          </button>
        </div>
      ))}
      <button type="button" className="btn btn--sm" onClick={onAdd}>
        {ar.items.actions.addRow}
      </button>
    </fieldset>
  );
}
