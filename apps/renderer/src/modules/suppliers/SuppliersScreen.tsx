/**
 * الموردون — supplier master, feeds the فاتورة شراء autocomplete (M4).
 */

import { useEffect, useRef, useState } from 'react';
import type { SupplierLedgerRow, SupplierRow } from '@pharmacy/shared';
import { fromPiastres, toAsciiDigits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';
import { EmptyState, TableSkeleton } from '../../components/EmptyState';
import { errorText } from '../../lib/errors';
import { SearchInput } from '../../components/SearchInput';

type Mode =
  | { view: 'list' }
  | { view: 'form'; existing: SupplierRow | null }
  | { view: 'account'; supplier: SupplierRow };

export function SuppliersScreen() {
  const [mode, setMode] = useState<Mode>({ view: 'list' });
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  async function load(q: string) {
    if (!window.api) {
      setError(ar.status.noBridge);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setRows(q.trim() ? await window.api.suppliers.search(q, 200) : await window.api.suppliers.list());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (mode.view === 'list') void load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.view]);

  useEffect(() => {
    if (mode.view !== 'list') return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(query), 120);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function deactivate(id: number) {
    if (!window.api) return;
    if (!confirm(ar.suppliers.confirmDeactivate)) return;
    try {
      await window.api.suppliers.deactivate(id);
    } catch (err) {
      setError(errorText(err));
    }
    void load(query);
  }

  if (mode.view === 'account') {
    return <SupplierAccount supplier={mode.supplier} onBack={() => setMode({ view: 'list' })} />;
  }

  if (mode.view === 'form') {
    return (
      <SupplierForm
        existing={mode.existing}
        onSaved={() => setMode({ view: 'list' })}
        onCancel={() => setMode({ view: 'list' })}
      />
    );
  }

  return (
    <div className="items">
      <div className="items__bar">
        <SearchInput
          className="field items__search"
          placeholder={ar.suppliers.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setMode({ view: 'form', existing: null })}
        >
          {ar.suppliers.add}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading ? (
        <TableSkeleton cols={5} />
      ) : rows.length === 0 ? (
        <EmptyState title={query.trim() ? ar.suppliers.noResults : ar.suppliers.empty} />
      ) : (
        <div className="table-wrap"><table className="datatable">
          <thead>
            <tr>
              <th>{ar.suppliers.code}</th>
              <th>{ar.suppliers.name}</th>
              <th>{ar.suppliers.phone1}</th>
              <th>{ar.suppliers.balance}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td dir="ltr">{r.code}</td>
                <td>{r.nameAr}</td>
                <td dir="ltr">{r.phone1 ?? '—'}</td>
                <td dir="ltr" className={r.balance > 0 ? 'strong' : 'muted'}>{fromPiastres(r.balance)}</td>
                <td className="datatable__actions">
                  <button type="button" className="btn btn--sm" onClick={() => setMode({ view: 'account', supplier: r })}>
                    {ar.suppliers.account}
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => setMode({ view: 'form', existing: r })}
                  >
                    {ar.suppliers.edit}
                  </button>
                  <button
                    type="button"
                    className="btn btn--danger btn--sm"
                    onClick={() => void deactivate(r.id)}
                  >
                    {ar.items.deactivate}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
    </div>
  );
}

function SupplierForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing: SupplierRow | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [nameAr, setNameAr] = useState(existing?.nameAr ?? '');
  const [phone1, setPhone1] = useState(existing?.phone1 ?? '');
  const [phone2, setPhone2] = useState(existing?.phone2 ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [taxNumber, setTaxNumber] = useState(existing?.taxNumber ?? '');
  const [openingBalance, setOpeningBalance] = useState<number | null>(
    existing?.openingBalance ?? null
  );
  const [paymentTermsDays, setPaymentTermsDays] = useState(
    existing?.paymentTermsDays != null ? String(existing.paymentTermsDays) : ''
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    setError(null);
    if (!nameAr.trim()) return setError(ar.suppliers.errors.nameRequired);

    const termsText = paymentTermsDays.trim();
    if (termsText && (!/^\d+$/.test(termsText) || Number(termsText) > 365)) {
      return setError(ar.suppliers.errors.negativePaymentTerms);
    }
    const termsDays = termsText === '' ? null : Number(termsText);
    for (const phone of [phone1, phone2]) {
      if (phone.trim() && !/^[\d+\- ]{6,20}$/.test(toAsciiDigits(phone.trim()))) return setError(ar.suppliers.errors.phoneInvalid);
    }

    if (!window.api) return setError(ar.status.noBridge);

    const input = {
      nameAr: nameAr.trim(),
      phone1: toAsciiDigits(phone1.trim()) || null,
      phone2: toAsciiDigits(phone2.trim()) || null,
      address: address.trim() || null,
      taxNumber: taxNumber.trim() || null,
      openingBalance: openingBalance ?? 0,
      paymentTermsDays: termsDays,
    };
    setSaving(true);
    try {
      if (existing) await window.api.suppliers.update(existing.id, input);
      else await window.api.suppliers.create(input);
      onSaved();
    } catch (err) {
      setError(`${ar.suppliers.errors.saveFailed}: ${errorText(err)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="item-form">
      <div className="item-form__toolbar">
        <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void submit()}>
          {ar.items.actions.save}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          {ar.items.actions.cancel}
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="panel">
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">
              {ar.suppliers.name}
              <span className="req"> *</span>
            </span>
            <input className="field" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.suppliers.phone1}</span>
            <input
              className="field"
              dir="ltr"
              inputMode="tel"
              value={phone1}
              onChange={(e) => setPhone1(toAsciiDigits(e.target.value))}
            />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.suppliers.phone2}</span>
            <input
              className="field"
              dir="ltr"
              inputMode="tel"
              value={phone2}
              onChange={(e) => setPhone2(toAsciiDigits(e.target.value))}
            />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.suppliers.taxNumber}</span>
            <input className="field" dir="ltr" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
          </label>
          <label className="formfield span2">
            <span className="formfield__label">{ar.suppliers.address}</span>
            <input className="field" value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.suppliers.openingBalance}</span>
            <MoneyInput value={openingBalance} onChange={setOpeningBalance} disabled={Boolean(existing)} allowNegative />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.suppliers.paymentTermsDays}</span>
            <input
              className="field"
              dir="ltr"
              inputMode="numeric"
              value={paymentTermsDays}
              onChange={(e) => setPaymentTermsDays(toAsciiDigits(e.target.value))}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

/** كشف حساب المورد + سداد — pay a supplier from the safe (not the shift drawer, D13). */
function SupplierAccount({ supplier, onBack }: { supplier: SupplierRow; onBack: () => void }) {
  const [ledger, setLedger] = useState<SupplierLedgerRow[]>([]);
  const [balance, setBalance] = useState(supplier.balance);
  const [amount, setAmount] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!window.api) return;
    const [l, b] = await Promise.all([window.api.suppliers.ledger(supplier.id, 200), window.api.suppliers.balance(supplier.id)]);
    setLedger(l);
    setBalance(b);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier.id]);

  async function pay() {
    if (!window.api || saving) return;
    setError(null);
    if (amount === null || amount <= 0) return setError(ar.errors['payment.amountInvalid']);
    setSaving(true);
    try {
      await window.api.suppliers.recordPayment(supplier.id, amount, note.trim() || null);
      setAmount(null);
      setNote('');
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  }

  const entryLabel = ar.suppliers.entryTypes as Record<string, string>;

  return (
    <div className="stack">
      <div className="items__bar">
        <button type="button" className="btn" onClick={onBack}>
          {ar.stock.back}
        </button>
        <h2 className="section-heading section-heading--inline">{supplier.nameAr}</h2>
      </div>
      {error && <div className="alert alert--error">{error}</div>}

      <div className="panel stack">
        <div className="formfield">
          <span className="formfield__label">{ar.suppliers.balance}</span>
          <span dir="ltr" className="strong">{fromPiastres(balance)}</span>
        </div>
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.suppliers.payAmount}</span>
            <MoneyInput value={amount} onChange={setAmount} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.suppliers.payNote}</span>
            <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <p className="hint">{ar.suppliers.payHint}</p>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void pay()}>
            {ar.suppliers.pay}
          </button>
        </div>
      </div>

      <fieldset className="fieldset">
        <legend>{ar.suppliers.statement}</legend>
        <div className="table-wrap"><table className="subtable">
          <thead>
            <tr>
              <th>{ar.suppliers.date}</th>
              <th>{ar.suppliers.entry}</th>
              <th>{ar.suppliers.debit}</th>
              <th>{ar.suppliers.credit}</th>
              <th>{ar.suppliers.balanceAfter}</th>
              <th>{ar.suppliers.payNote}</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((e) => (
              <tr key={e.id}>
                <td dir="ltr">{e.at.slice(0, 16)}</td>
                <td>{entryLabel[e.entryType] ?? e.entryType}</td>
                <td dir="ltr">{e.debit ? fromPiastres(e.debit) : '—'}</td>
                <td dir="ltr">{e.credit ? fromPiastres(e.credit) : '—'}</td>
                <td dir="ltr">{fromPiastres(e.balanceAfter)}</td>
                <td>{e.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </fieldset>
    </div>
  );
}
