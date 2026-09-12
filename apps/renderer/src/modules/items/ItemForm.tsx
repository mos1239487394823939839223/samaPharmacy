/**
 * اضافة صنف — four tabs, per blueprint §1.4.
 *
 * Ctrl+Shift+S saves and ESC cancels (blueprint §1.2). Both read event.code
 * (rule 4). Every string comes from the i18n file.
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemDetail, ItemInput } from '@pharmacy/shared';
import { validateUnitSet } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { attachShortcuts, formatShortcut } from '../../lib/shortcuts';
import { useBarcodeScanner, isValidEan, classifyBarcode } from '../../hardware/scanner';
import { loadScannerConfig } from '../../hardware/config';

type Tab = 'basic' | 'pricing' | 'supplier' | 'settings';

interface UnitRow {
  nameAr: string;
  factor: string;
  salePrice: number | null;
  isBase: boolean;
  isDefaultSale: boolean;
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
  const [internationalCode, setInternationalCode] = useState('');
  const [origin, setOrigin] = useState<'local' | 'imported'>('local');
  const [itemNature, setItemNature] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [mainIngredientPct, setMainIngredientPct] = useState('');
  const [noExpiry, setNoExpiry] = useState(Boolean(existing?.noExpiry));
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [scheduleClass, setScheduleClass] = useState<
    'none' | 'table1' | 'table2' | 'table3'
  >((existing?.scheduleClass as 'none') ?? 'none');
  const [storageCondition, setStorageCondition] = useState<'room' | 'fridge' | 'freezer'>(
    (existing?.storageCondition as 'room') ?? 'room'
  );
  const [shelfLocation, setShelfLocation] = useState(existing?.shelfLocation ?? '');
  const [publicPrice, setPublicPrice] = useState<number | null>(existing?.publicPrice ?? null);
  const [minStock, setMinStock] = useState('0');
  const [maxStock, setMaxStock] = useState('');

  const [barcodes, setBarcodes] = useState<string[]>(
    existing?.barcodes?.length ? existing.barcodes : ['']
  );

  const [units, setUnits] = useState<UnitRow[]>(() =>
    existing?.units?.length
      ? existing.units.map((u) => ({
          nameAr: u.nameAr,
          factor: String(u.factor),
          salePrice: u.salePrice,
          isBase: Boolean(u.isBase),
          isDefaultSale: Boolean(u.isDefaultSale),
        }))
      : [{ nameAr: '', factor: '1', salePrice: null, isBase: true, isDefaultSale: true }]
  );

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
        if (el.dataset?.scanTarget === 'barcode') return false;
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

  useEffect(
    () =>
      attachShortcuts([
        { id: 'save', ...SAVE, run: () => submitRef.current() },
        { id: 'cancel', code: 'Escape', run: () => cancelRef.current() },
      ]),
    []
  );

  function buildInput(): ItemInput {
    const cleanBarcodes = barcodes.map((b) => b.trim()).filter(Boolean);
    const cleanUnits = units
      .filter((u) => u.nameAr.trim() !== '')
      .map((u) => ({
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

    if (input.units && input.units.length > 0) {
      const unitErrors = validateUnitSet(
        input.units.map((u, i) => ({
          id: i,
          nameAr: u.nameAr,
          factor: u.factor,
          isBase: u.isBase,
        }))
      );
      if (unitErrors.length > 0) return ar.items.errors.needBaseUnit;

      // BR-4: sale price may never exceed the EDA public price. Compared per
      // base unit, since public_price is stored per base unit.
      if (input.publicPrice != null) {
        for (const u of input.units) {
          const perBase = u.salePrice / u.factor;
          if (perBase > input.publicPrice) return ar.items.errors.priceAbovePublic;
        }
      }
    }

    return null;
  }

  async function submit() {
    if (saving) return;
    setError(null);

    const input = buildInput();
    const problem = validate(input);
    if (problem) {
      setError(problem);
      return;
    }

    setSaving(true);
    try {
      if (!window.api) throw new Error(ar.status.noBridge);
      if (existing) await window.api.items.update(existing.id, input);
      else await window.api.items.create(input);
      onSaved();
    } catch (err) {
      const message = (err as Error).message;
      setError(
        /UNIQUE constraint failed: item_barcodes/.test(message)
          ? ar.items.errors.duplicateBarcode
          : `${ar.items.errors.saveFailed}: ${message}`
      );
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
                  value={internationalCode}
                  onChange={(e) => setInternationalCode(e.target.value)}
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
                    onChange={(e) => setMainIngredientPct(e.target.value)}
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

            <fieldset className="fieldset">
              <legend>{ar.items.fields.units}</legend>
              <table className="subtable">
                <thead>
                  <tr>
                    <th>{ar.items.fields.unitName}</th>
                    <th>{ar.items.fields.unitFactor}</th>
                    <th>{ar.items.fields.unitPrice}</th>
                    <th>{ar.items.fields.unitIsBase}</th>
                    <th>{ar.items.fields.unitDefaultSale}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {units.map((u, i) => (
                    <tr key={i}>
                      <td>
                        <input
                          className="field"
                          value={u.nameAr}
                          onChange={(e) => patchUnit(i, { nameAr: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="field"
                          dir="ltr"
                          inputMode="numeric"
                          value={u.factor}
                          onChange={(e) => patchUnit(i, { factor: e.target.value })}
                        />
                      </td>
                      <td>
                        <MoneyInput
                          value={u.salePrice}
                          onChange={(v) => patchUnit(i, { salePrice: v })}
                        />
                      </td>
                      <td className="center">
                        <input
                          type="radio"
                          name="baseUnit"
                          checked={u.isBase}
                          onChange={() =>
                            setUnits(units.map((x, idx) => ({ ...x, isBase: idx === i })))
                          }
                        />
                      </td>
                      <td className="center">
                        <input
                          type="radio"
                          name="defaultSale"
                          checked={u.isDefaultSale}
                          onChange={() =>
                            setUnits(
                              units.map((x, idx) => ({ ...x, isDefaultSale: idx === i }))
                            )
                          }
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => setUnits(units.filter((_, idx) => idx !== i))}
                          disabled={units.length === 1}
                        >
                          {ar.items.actions.removeRow}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="btn btn--sm"
                onClick={() =>
                  setUnits([
                    ...units,
                    {
                      nameAr: '',
                      factor: '1',
                      salePrice: null,
                      isBase: false,
                      isDefaultSale: false,
                    },
                  ])
                }
              >
                {ar.items.actions.addRow}
              </button>
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
                onChange={(e) => setMinStock(e.target.value)}
              />
            </Field>
            <Field label={ar.items.fields.maxStock}>
              <input
                className="field"
                dir="ltr"
                inputMode="numeric"
                value={maxStock}
                onChange={(e) => setMaxStock(e.target.value)}
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
