/**
 * اضافة عميل — blueprint §1.5: core fields, B2B (pharmacy/clinic), payment
 * method with credit limit, three discount rates (decision D8: cash / credit
 * / whole-invoice override), tags, and demographics.
 */

import { useState } from 'react';
import type { CustomerDetail } from '@pharmacy/shared';
import { toAsciiDigits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';

interface Props {
  existing?: CustomerDetail | null;
  onSaved: () => void;
  onCancel: () => void;
}

export function CustomerForm({ existing, onSaved, onCancel }: Props) {
  const [name, setName] = useState(existing?.name ?? '');
  const [mobile1, setMobile1] = useState(existing?.mobile1 ?? '');
  const [mobile2, setMobile2] = useState(existing?.mobile2 ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [accountType, setAccountType] = useState<'individual' | 'pharmacy' | 'clinic' | 'company'>(
    (existing?.accountType as 'individual') ?? 'individual'
  );
  const [pharmacyOwnerName, setPharmacyOwnerName] = useState('');
  const [pharmacyPhone, setPharmacyPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>(
    (existing?.paymentMethod as 'cash') ?? 'cash'
  );
  const [openingBalance, setOpeningBalance] = useState<number | null>(existing?.openingBalance ?? null);
  const [creditLimit, setCreditLimit] = useState<number | null>(existing?.creditLimit ?? null);
  const [isVip, setIsVip] = useState(Boolean(existing?.isVip));
  const [discountCashPct, setDiscountCashPct] = useState(String(existing?.discountCashPct ?? 0));
  const [discountCreditPct, setDiscountCreditPct] = useState(String(existing?.discountCreditPct ?? 0));
  const [discountInvoicePct, setDiscountInvoicePct] = useState(String(existing?.discountInvoicePct ?? 0));
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addTag() {
    const t = tagDraft.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagDraft('');
  }

  /** Digits-only, at least 8 digits — after Arabic-Indic digits are folded to ASCII. */
  function isValidMobile(v: string): boolean {
    return /^\d{8,}$/.test(v);
  }

  /** Parses to a finite number in [0, 100]; used for all three discount fields. */
  function parseDiscountPct(v: string): number | null {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return n;
  }

  async function submit() {
    setError(null);

    const mobile1Ascii = toAsciiDigits(mobile1.trim());
    const mobile2Ascii = toAsciiDigits(mobile2.trim());
    const pharmacyPhoneAscii = toAsciiDigits(pharmacyPhone.trim());

    if (!name.trim()) return setError(ar.customers.errors.nameRequired);
    if (!mobile1Ascii) return setError(ar.customers.errors.mobileRequired);
    if (!isValidMobile(mobile1Ascii)) return setError(ar.customers.errors.mobileInvalid);
    if (mobile2Ascii && !isValidMobile(mobile2Ascii)) return setError(ar.customers.errors.mobileInvalid);

    const cashPct = parseDiscountPct(discountCashPct);
    const creditPct = parseDiscountPct(discountCreditPct);
    const invoicePct = parseDiscountPct(discountInvoicePct);
    if (cashPct === null || creditPct === null || invoicePct === null) {
      return setError(ar.customers.errors.discountInvalid);
    }

    if (!window.api) return setError(ar.status.noBridge);

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        mobile1: mobile1Ascii,
        mobile2: mobile2Ascii || null,
        email: email.trim() || null,
        accountType,
        pharmacyOwnerName: pharmacyOwnerName.trim() || null,
        pharmacyPhone: pharmacyPhoneAscii || null,
        paymentMethod,
        openingBalance: openingBalance ?? 0,
        creditLimit: paymentMethod === 'credit' ? creditLimit : null,
        isVip,
        discountCashPct: cashPct,
        discountCreditPct: creditPct,
        discountInvoicePct: invoicePct,
        tags,
        notes: notes.trim() || null,
      };
      if (existing) await window.api.customers.update(existing.id, input);
      else await window.api.customers.create(input);
      onSaved();
    } catch (err) {
      const message = (err as Error).message;
      // A ZodError message is raw English JSON from the shared schema — the
      // client-side checks above should catch the same issues first, so
      // surfacing this means an unexpected shape slipped through them.
      setError(message.startsWith('[') ? ar.customers.errors.saveFailedValidation : `${ar.customers.errors.saveFailed}: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="item-form">
      <div className="item-form__toolbar">
        <button type="button" className="btn btn--primary" onClick={() => void submit()} disabled={saving}>
          {ar.items.actions.save}
        </button>
        <button type="button" className="btn" onClick={onCancel} disabled={saving}>
          {ar.items.actions.cancel}
        </button>
        {existing && (
          <span className="item-form__code" dir="ltr">
            {ar.customers.code}: {existing.code}
          </span>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="panel">
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">
              {ar.customers.name}
              <span className="req"> *</span>
            </span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">
              {ar.customers.mobile1}
              <span className="req"> *</span>
            </span>
            <input className="field" dir="ltr" inputMode="tel" value={mobile1} onChange={(e) => setMobile1(toAsciiDigits(e.target.value))} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.customers.mobile2}</span>
            <input className="field" dir="ltr" inputMode="tel" value={mobile2} onChange={(e) => setMobile2(toAsciiDigits(e.target.value))} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.customers.email}</span>
            <input className="field" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.customers.accountType}</span>
            <select className="field" value={accountType} onChange={(e) => setAccountType(e.target.value as 'individual')}>
              <option value="individual">{ar.customers.accountTypes.individual}</option>
              <option value="pharmacy">{ar.customers.accountTypes.pharmacy}</option>
              <option value="clinic">{ar.customers.accountTypes.clinic}</option>
              <option value="company">{ar.customers.accountTypes.company}</option>
            </select>
          </label>
          <label className="check check--end">
            <input type="checkbox" checked={isVip} onChange={(e) => setIsVip(e.target.checked)} />
            <span>{ar.customers.isVip}</span>
          </label>
        </div>

        {(accountType === 'pharmacy' || accountType === 'clinic') && (
          <fieldset className="fieldset">
            <legend>{ar.customers.pharmacyOwnerName}</legend>
            <div className="grid2">
              <label className="formfield">
                <span className="formfield__label">{ar.customers.pharmacyOwnerName}</span>
                <input className="field" value={pharmacyOwnerName} onChange={(e) => setPharmacyOwnerName(e.target.value)} />
              </label>
              <label className="formfield">
                <span className="formfield__label">{ar.customers.pharmacyPhone}</span>
                <input className="field" dir="ltr" inputMode="tel" value={pharmacyPhone} onChange={(e) => setPharmacyPhone(toAsciiDigits(e.target.value))} />
              </label>
            </div>
          </fieldset>
        )}

        <fieldset className="fieldset">
          <legend>{ar.customers.paymentMethod}</legend>
          <div className="grid2">
            <label className="formfield">
              <span className="formfield__label">{ar.customers.paymentMethod}</span>
              <select
                className="field"
                value={paymentMethod}
                onChange={(e) => {
                  const next = e.target.value as 'cash' | 'credit';
                  setPaymentMethod(next);
                  if (next === 'cash') setCreditLimit(null);
                }}
              >
                <option value="cash">{ar.customers.cash}</option>
                <option value="credit">{ar.customers.credit}</option>
              </select>
            </label>
            <label className="formfield">
              <span className="formfield__label">{ar.customers.openingBalance}</span>
              <MoneyInput value={openingBalance} onChange={setOpeningBalance} disabled={Boolean(existing)} />
            </label>
            <label className="formfield">
              <span className="formfield__label">{ar.customers.creditLimit}</span>
              <MoneyInput
                value={paymentMethod === 'credit' ? creditLimit : null}
                onChange={setCreditLimit}
                placeholder={ar.customers.noLimit}
                disabled={paymentMethod !== 'credit'}
              />
            </label>
          </div>
          <div className="grid2 mt">
            <label className="formfield">
              <span className="formfield__label">{ar.customers.discountCashPct}</span>
              <input className="field" dir="ltr" inputMode="decimal" value={discountCashPct} onChange={(e) => setDiscountCashPct(toAsciiDigits(e.target.value))} />
            </label>
            <label className="formfield">
              <span className="formfield__label">{ar.customers.discountCreditPct}</span>
              <input className="field" dir="ltr" inputMode="decimal" value={discountCreditPct} onChange={(e) => setDiscountCreditPct(toAsciiDigits(e.target.value))} />
            </label>
            <label className="formfield">
              <span className="formfield__label">{ar.customers.discountInvoicePct}</span>
              <input className="field" dir="ltr" inputMode="decimal" value={discountInvoicePct} onChange={(e) => setDiscountInvoicePct(toAsciiDigits(e.target.value))} />
            </label>
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>{ar.customers.tags}</legend>
          <div className="tag-row">
            {tags.map((t) => (
              <span key={t} className="badge">
                {t} <button type="button" className="tag-remove" onClick={() => setTags(tags.filter((x) => x !== t))}>
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            className="field"
            placeholder={ar.customers.tagsHint}
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
        </fieldset>

        <label className="formfield mt">
          <span className="formfield__label">{ar.customers.notes}</span>
          <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>
    </div>
  );
}
