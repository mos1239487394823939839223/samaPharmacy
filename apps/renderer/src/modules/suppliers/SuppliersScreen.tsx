/**
 * الموردون — supplier master, feeds the فاتورة شراء autocomplete (M4).
 */

import { useEffect, useRef, useState } from 'react';
import type { SupplierRow } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { MoneyInput } from '../../components/MoneyInput';

type Mode = { view: 'list' } | { view: 'form'; existing: SupplierRow | null };

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
      setError((err as Error).message);
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
    await window.api.suppliers.deactivate(id);
    void load(query);
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
        <input
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
        <p className="muted">{ar.items.loading}</p>
      ) : rows.length === 0 ? (
        <p className="muted">{query.trim() ? ar.suppliers.noResults : ar.suppliers.empty}</p>
      ) : (
        <table className="datatable">
          <thead>
            <tr>
              <th>{ar.suppliers.code}</th>
              <th>{ar.suppliers.name}</th>
              <th>{ar.suppliers.phone1}</th>
              <th>{ar.suppliers.openingBalance}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td dir="ltr">{r.code}</td>
                <td>{r.nameAr}</td>
                <td dir="ltr">{r.phone1 ?? '—'}</td>
                <td dir="ltr">{fromPiastres(r.openingBalance)}</td>
                <td className="datatable__actions">
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
        </table>
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

  async function submit() {
    if (!window.api || !nameAr.trim()) {
      setError(ar.items.errors.nameRequired);
      return;
    }
    const input = {
      nameAr: nameAr.trim(),
      phone1: phone1.trim() || null,
      phone2: phone2.trim() || null,
      address: address.trim() || null,
      taxNumber: taxNumber.trim() || null,
      openingBalance: openingBalance ?? 0,
      paymentTermsDays: paymentTermsDays === '' ? null : Number(paymentTermsDays),
    };
    try {
      if (existing) await window.api.suppliers.update(existing.id, input);
      else await window.api.suppliers.create(input);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="item-form">
      <div className="item-form__toolbar">
        <button type="button" className="btn btn--primary" onClick={() => void submit()}>
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
            <input className="field" dir="ltr" value={phone1} onChange={(e) => setPhone1(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.suppliers.phone2}</span>
            <input className="field" dir="ltr" value={phone2} onChange={(e) => setPhone2(e.target.value)} />
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
            <MoneyInput value={openingBalance} onChange={setOpeningBalance} disabled={Boolean(existing)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.suppliers.paymentTermsDays}</span>
            <input
              className="field"
              dir="ltr"
              inputMode="numeric"
              value={paymentTermsDays}
              onChange={(e) => setPaymentTermsDays(e.target.value)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
