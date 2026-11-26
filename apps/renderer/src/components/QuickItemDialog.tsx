/**
 * «صنف جديد سريع» — add a medicine in seconds without leaving the invoice:
 * name, box price, how it is sold (whole box, or box + strip + tablet with
 * the counts), barcode (scan the box). Units and their prices are built from
 * those answers — the strip and tablet at their share of the box price. The
 * full item form stays available for everything else.
 */

import { useState } from 'react';
import type { ItemDetail, ItemUnitInput } from '@pharmacy/shared';
import { fromPiastresGrouped, maxUnitPrice, toAsciiDigits } from '@pharmacy/core';
import { ar } from '../i18n/ar';
import { MoneyInput } from './MoneyInput';
import { errorText } from '../lib/errors';
import { useBusy } from '../lib/useBusy';

const t = ar.quickItem;
type SoldAs = 'box' | 'tablets' | 'strips';

interface Props {
  /** Text the user had typed in the search box — becomes the name. */
  initialName?: string;
  /** A scanned barcode that matched nothing. */
  initialBarcode?: string;
  onCreated: (item: ItemDetail) => void;
  onClose: () => void;
}

export function QuickItemDialog({ initialName = '', initialBarcode = '', onCreated, onClose }: Props) {
  const looksLikeCode = /^\d{6,}$/.test(toAsciiDigits(initialName.trim()));
  const [name, setName] = useState(looksLikeCode ? '' : initialName.trim());
  const [barcode, setBarcode] = useState(initialBarcode || (looksLikeCode ? toAsciiDigits(initialName.trim()) : ''));
  const [price, setPrice] = useState<number | null>(null);
  const [soldAs, setSoldAs] = useState<SoldAs>('tablets');
  const [perBox, setPerBox] = useState('');
  const [perStrip, setPerStrip] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { busy, run } = useBusy();

  const box = Number(toAsciiDigits(perBox));
  const strip = Number(toAsciiDigits(perStrip));

  function units(): ItemUnitInput[] | string {
    if (!price || price <= 0) return t.errors.price;
    if (soldAs === 'box') return [{ nameAr: t.box, factor: 1, salePrice: price, isBase: true, isDefaultSale: true }];
    if (!Number.isInteger(box) || box < 2) return t.errors.perBox;
    const list: ItemUnitInput[] = [
      { nameAr: t.tablet, factor: 1, salePrice: maxUnitPrice(price, box, 1), isBase: true, isDefaultSale: false },
      { nameAr: t.box, factor: box, salePrice: price, isBase: false, isDefaultSale: true },
    ];
    if (soldAs === 'strips') {
      if (!Number.isInteger(strip) || strip < 2 || strip >= box || box % strip !== 0) return t.errors.perStrip;
      list.splice(1, 0, { nameAr: t.strip, factor: strip, salePrice: maxUnitPrice(price, box, strip), isBase: false, isDefaultSale: false });
    }
    return list;
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError(t.errors.name);
    const u = units();
    if (typeof u === 'string') return setError(u);
    try {
      const id = await window.api!.items.create({
        nameAr: name.trim(),
        publicPrice: price,
        barcodes: barcode.trim() ? [toAsciiDigits(barcode.trim())] : [],
        units: u,
      });
      const item = await window.api!.items.get(id);
      if (item) onCreated(item);
    } catch (err) {
      setError(errorText(err));
    }
  }

  const preview = (() => {
    if (!price || price <= 0) return null;
    if (soldAs === 'box') return `${t.box}: ${fromPiastresGrouped(price)}`;
    if (!(box >= 2)) return null;
    const parts = [`${t.box} (${box}): ${fromPiastresGrouped(price)}`];
    if (soldAs === 'strips' && strip >= 2 && box % strip === 0) parts.push(`${t.strip} (${strip}): ${fromPiastresGrouped(maxUnitPrice(price, box, strip))}`);
    parts.push(`${t.tablet}: ${fromPiastresGrouped(maxUnitPrice(price, box, 1))}`);
    return parts.join(' · ');
  })();

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onKeyDown={(e) => e.code === 'Escape' && onClose()}>
      <form
        className="modal panel stack quick-item"
        onSubmit={(e) => {
          e.preventDefault();
          void run(save);
        }}
      >
        <h2 className="section-heading">{t.title}</h2>
        <p className="hint" style={{ margin: 0 }}>
          {t.intro}
        </p>
        {error && <div className="alert alert--error">{error}</div>}

        <div className="quick-item__grid">
          <label className="formfield quick-item__wide">
            <span className="formfield__label">
              {t.name}
              <span className="req"> *</span>
            </span>
            <input className="field" autoFocus value={name} maxLength={300} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">
              {t.price}
              <span className="req"> *</span>
            </span>
            <MoneyInput value={price} onChange={setPrice} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{t.barcode}</span>
            <input
              className="field"
              dir="ltr"
              inputMode="numeric"
              data-scan-target="quick-barcode"
              placeholder={t.barcodeHint}
              value={barcode}
              onChange={(e) => setBarcode(toAsciiDigits(e.target.value).replace(/\s+/g, ''))}
              // A scanner ends with Enter: keep it from submitting a half-filled form.
              onKeyDown={(e) => {
                if (e.code === 'Enter' || e.code === 'NumpadEnter') e.preventDefault();
              }}
            />
          </label>

        <div className="formfield quick-item__wide">
          <span className="formfield__label">{t.soldAs}</span>
          <div className="segmented" role="radiogroup">
            {(['tablets', 'strips', 'box'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={soldAs === s}
                className={soldAs === s ? 'segmented__btn segmented__btn--active' : 'segmented__btn'}
                onClick={() => setSoldAs(s)}
              >
                {t.soldAsOptions[s]}
              </button>
            ))}
          </div>
        </div>

        {soldAs !== 'box' && (
          <>
            <label className="formfield">
              <span className="formfield__label">{t.perBox}</span>
              <input className="field" dir="ltr" inputMode="numeric" placeholder="20" value={perBox} onChange={(e) => setPerBox(toAsciiDigits(e.target.value))} />
            </label>
            {soldAs === 'strips' && (
              <label className="formfield">
                <span className="formfield__label">{t.perStrip}</span>
                <input className="field" dir="ltr" inputMode="numeric" placeholder="10" value={perStrip} onChange={(e) => setPerStrip(toAsciiDigits(e.target.value))} />
              </label>
            )}
          </>
        )}
        </div>

        {preview && <div className="quick-item__preview">{preview}</div>}

        <div className="btn-row">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {t.save}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            {ar.common.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
