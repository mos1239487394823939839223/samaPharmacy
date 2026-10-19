/**
 * التأمين الطبي (spec M6) — three tabs:
 *   شركات التأمين: contracts (coverage %, per-invoice cap, approval number
 *                  required) and the items each company does not cover;
 *   المطالبات:     batch a company's unclaimed insured invoices for a period
 *                  into a claim, mark it sent, then settle it with what was
 *                  paid and which invoices were rejected (and why);
 *   المستحقات:     what each company still owes.
 */

import { Fragment, useEffect, useRef, useState } from 'react';
import type {
  ClaimableInvoice,
  ClaimLineRow,
  ClaimRow,
  InsuranceCompanyInput,
  InsuranceCompanyRow,
  InsuranceReceivableRow,
  ItemListRow,
} from '@pharmacy/shared';
import { addDays, fromPiastres, toAsciiDigits, todayLocal } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { useBusy } from '../../lib/useBusy';
import { errorText } from '../../lib/errors';
import { useToast } from '../../components/Toast';
import { MoneyInput } from '../../components/MoneyInput';
import { Stat } from '../../components/Stat';
import { exportCsv } from '../../lib/csv';

type Tab = 'companies' | 'claims' | 'receivables';
const t = ar.insurance;

export function InsuranceScreen() {
  const [tab, setTab] = useState<Tab>('companies');
  return (
    <div className="stack">
      <div className="btn-row" style={{ marginBlockStart: 0 }}>
        {(['companies', 'claims', 'receivables'] as const).map((k) => (
          <button key={k} type="button" className={tab === k ? 'btn btn--primary btn--sm' : 'btn btn--sm'} onClick={() => setTab(k)}>
            {t[k]}
          </button>
        ))}
      </div>
      {tab === 'companies' && <CompaniesTab />}
      {tab === 'claims' && <ClaimsTab />}
      {tab === 'receivables' && <ReceivablesTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function CompaniesTab() {
  const [rows, setRows] = useState<InsuranceCompanyRow[]>([]);
  const [editing, setEditing] = useState<InsuranceCompanyRow | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setRows(await window.api!.insurance.companies(true));
    } catch (err) {
      setError(errorText(err));
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function toggle(c: InsuranceCompanyRow) {
    try {
      await window.api!.insurance.setCompanyActive(c.id, !c.isActive);
      await load();
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <>
      <div className="items__bar">
        <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
          {t.add}
        </button>
      </div>
      {error && <div className="alert alert--error">{error}</div>}
      <div className="table-wrap"><table className="datatable">
        <thead>
          <tr>
            <th>{t.name}</th>
            <th>{t.coverage}</th>
            <th>{t.cap}</th>
            <th>{t.requiresApproval}</th>
            <th>{t.excluded}</th>
            <th>{t.status}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.nameAr}</td>
              <td dir="ltr">{c.coveragePct}%</td>
              <td dir="ltr">{c.maxPerInvoice != null ? fromPiastres(c.maxPerInvoice) : '—'}</td>
              <td>{c.requiresApprovalNo ? '✓' : ''}</td>
              <td dir="ltr">{c.excludedCount}</td>
              <td>
                <span className={c.isActive ? 'badge badge--success' : 'badge badge--muted'}>{c.isActive ? t.active : t.inactive}</span>
              </td>
              <td className="datatable__actions">
                <button type="button" className="btn btn--sm" onClick={() => setEditing(c)}>
                  {t.edit}
                </button>
                <button type="button" className={c.isActive ? 'btn btn--danger btn--sm' : 'btn btn--sm'} onClick={() => void toggle(c)}>
                  {c.isActive ? t.deactivate : t.activate}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {editing && (
        <CompanyDialog
          existing={editing === 'new' ? null : editing}
          onClose={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </>
  );
}

function CompanyDialog({ existing, onClose }: { existing: InsuranceCompanyRow | null; onClose: () => void }) {
  const { busy, run } = useBusy();
  const [id, setId] = useState<number | null>(existing?.id ?? null);
  const [nameAr, setNameAr] = useState(existing?.nameAr ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [contactName, setContactName] = useState(existing?.contactName ?? '');
  const [coverage, setCoverage] = useState(String(existing?.coveragePct ?? 80));
  const [cap, setCap] = useState<number | null>(existing?.maxPerInvoice ?? null);
  const [requiresApproval, setRequiresApproval] = useState(Boolean(existing?.requiresApprovalNo));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [excluded, setExcluded] = useState<Array<{ itemId: number; nameAr: string }>>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemListRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (id) void window.api!.insurance.exclusions(id).then(setExcluded);
  }, [id]);
  useEffect(() => {
    if (!query.trim()) return setResults([]);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void window.api!.items.search(query, 10).then(setResults), 120);
  }, [query]);

  async function save() {
    setError(null);
    const pct = Number(toAsciiDigits(coverage));
    if (!nameAr.trim()) return setError(ar.errors['insurance.nameRequired']);
    if (!coverage.trim() || !(pct >= 0 && pct <= 100)) return setError(ar.errors['insurance.coverageInvalid']);
    const input: InsuranceCompanyInput = {
      nameAr: nameAr.trim(),
      phone: phone.trim() || null,
      contactName: contactName.trim() || null,
      coveragePct: pct,
      maxPerInvoice: cap,
      requiresApprovalNo: requiresApproval,
      notes: notes.trim() || null,
    };
    try {
      if (id) await window.api!.insurance.updateCompany(id, input);
      else setId(await window.api!.insurance.createCompany(input));
      showToast(t.saved);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function exclude(itemId: number, on: boolean) {
    if (!id) return;
    await window.api!.insurance.setExclusion(id, itemId, on);
    setExcluded(await window.api!.insurance.exclusions(id));
    setQuery('');
    setResults([]);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onKeyDown={(e) => e.code === 'Escape' && onClose()}>
      <div className="modal modal--wide panel stack">
        <h2 className="section-heading">{existing ? t.edit : t.add}</h2>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{t.name}</span>
            <input className="field" autoFocus value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{t.coverage}</span>
            <input className="field field--sm" dir="ltr" inputMode="decimal" value={coverage} onChange={(e) => setCoverage(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{t.cap}</span>
            <MoneyInput value={cap} onChange={setCap} placeholder={t.capHint} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{t.phone}</span>
            <input className="field" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{t.contact}</span>
            <input className="field" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{t.notes}</span>
            <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
          <span>{t.requiresApproval}</span>
        </label>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void run(save)}>
            {t.save}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            {ar.common.cancel}
          </button>
        </div>

        {id && (
          <fieldset className="fieldset">
            <legend>{t.excluded}</legend>
            <p className="hint">{t.excludedHint}</p>
            <div className="field-wrap">
              <input className="field" placeholder={t.addExcluded} value={query} onChange={(e) => setQuery(e.target.value)} />
              {results.length > 0 && (
                <ul className="autocomplete">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => void exclude(r.id, true)}>
                        {r.nameAr}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ul className="stack-sm">
              {excluded.map((e) => (
                <li key={e.itemId} className="btn-row" style={{ marginBlockStart: 0 }}>
                  <span>{e.nameAr}</span>
                  <button type="button" className="btn btn--danger btn--sm" onClick={() => void exclude(e.itemId, false)}>
                    {t.remove}
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ClaimsTab() {
  const [companies, setCompanies] = useState<InsuranceCompanyRow[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [from, setFrom] = useState(() => addDays(todayLocal(), -30));
  const [to, setTo] = useState(() => todayLocal());
  const [preview, setPreview] = useState<ClaimableInvoice[] | null>(null);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [lines, setLines] = useState<ClaimLineRow[]>([]);
  const [settling, setSettling] = useState<ClaimRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function loadClaims() {
    setClaims(await window.api!.insurance.claims());
  }
  useEffect(() => {
    void window.api!.insurance.companies().then((list) => {
      setCompanies(list);
      setCompanyId(list[0]?.id ?? null);
    });
    void loadClaims();
  }, []);

  async function run(work: () => Promise<unknown>) {
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function toggle(c: ClaimRow) {
    if (open === c.id) return setOpen(null);
    setOpen(c.id);
    setLines(await window.api!.insurance.claimLines(c.id));
  }

  async function exportClaim(c: ClaimRow) {
    const rows = await window.api!.insurance.claimLines(c.id);
    const msg = await exportCsv(
      `claim-${c.serial}-${c.companyName}.csv`,
      [t.invoice, t.date, t.memberNo, t.approvalNo, t.amount, t.rejectReason],
      rows.map((l) => [l.serial, l.confirmedAt, l.memberNo ?? '', l.approvalNo ?? '', fromPiastres(l.amount), l.rejectedReason ?? ''])
    );
    if (msg) showToast(msg, 'info');
  }

  return (
    <>
      {error && <div className="alert alert--error">{error}</div>}
      <div className="panel">
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{t.company}</span>
            <select className="field" value={companyId ?? ''} onChange={(e) => setCompanyId(Number(e.target.value))}>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr}
                </option>
              ))}
            </select>
          </label>
          <label className="formfield">
            <span className="formfield__label">{t.from}</span>
            <input className="field" type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{t.to}</span>
            <input className="field" type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--sm"
            disabled={!companyId}
            onClick={() => void run(async () => setPreview(await window.api!.insurance.unclaimed(companyId!, from, to)))}
          >
            {t.preview}
          </button>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!companyId || !preview || preview.length === 0}
            onClick={() =>
              void run(async () => {
                const id = await window.api!.insurance.createClaim(companyId!, from, to);
                await loadClaims();
                setPreview(null);
                const created = (await window.api!.insurance.claims()).find((c) => c.id === id);
                showToast(t.claimCreated.replace('{serial}', String(created?.serial ?? id)));
              })
            }
          >
            {t.createClaim}
          </button>
        </div>
        {preview &&
          (preview.length === 0 ? (
            <p className="muted">{t.nothing}</p>
          ) : (
            <>
              <div className="table-wrap"><table className="subtable">
                <thead>
                  <tr>
                    <th>{t.invoice}</th>
                    <th>{t.date}</th>
                    <th>{t.memberNo}</th>
                    <th>{t.approvalNo}</th>
                    <th>{t.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((i) => (
                    <tr key={i.invoiceId}>
                      <td dir="ltr">{i.serial}</td>
                      <td dir="ltr">{i.confirmedAt.slice(0, 10)}</td>
                      <td dir="ltr">{i.memberNo ?? '—'}</td>
                      <td dir="ltr">{i.approvalNo ?? '—'}</td>
                      <td dir="ltr">{fromPiastres(i.claimable)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
              <div className="stats">
                <Stat label={t.claimed} value={fromPiastres(preview.reduce((s, i) => s + i.claimable, 0))} good />
              </div>
            </>
          ))}
      </div>

      <div className="table-wrap"><table className="datatable">
        <thead>
          <tr>
            <th>{t.serial}</th>
            <th>{t.company}</th>
            <th>{t.period}</th>
            <th>{t.status}</th>
            <th>{t.claimed}</th>
            <th>{t.paid}</th>
            <th>{t.rejected}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <Fragment key={c.id}>
              <tr>
                <td dir="ltr">{c.serial}</td>
                <td>{c.companyName}</td>
                <td dir="ltr">
                  {c.periodFrom} → {c.periodTo}
                </td>
                <td>{t.statuses[c.status]}</td>
                <td dir="ltr">{fromPiastres(c.totalClaimed)}</td>
                <td dir="ltr">{c.totalPaid != null ? fromPiastres(c.totalPaid) : '—'}</td>
                <td dir="ltr">{c.totalRejected != null ? fromPiastres(c.totalRejected) : '—'}</td>
                <td className="datatable__actions">
                  <button type="button" className="btn btn--sm" onClick={() => void toggle(c)}>
                    {t.view}
                  </button>
                  <button type="button" className="btn btn--sm" onClick={() => void exportClaim(c)}>
                    {t.export}
                  </button>
                  {c.status === 'draft' && (
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => void run(async () => { await window.api!.insurance.submitClaim(c.id); await loadClaims(); })}
                    >
                      {t.submit}
                    </button>
                  )}
                  {c.status === 'submitted' && (
                    <button type="button" className="btn btn--primary btn--sm" onClick={() => setSettling(c)}>
                      {t.settle}
                    </button>
                  )}
                </td>
              </tr>
              {open === c.id && (
                <tr>
                  <td colSpan={8}>
                    <div className="table-wrap"><table className="subtable">
                      <tbody>
                        {lines.map((l) => (
                          <tr key={l.id} className={l.rejected ? 'text-bad' : ''}>
                            <td dir="ltr">{l.serial}</td>
                            <td dir="ltr">{l.confirmedAt.slice(0, 10)}</td>
                            <td dir="ltr">{l.memberNo ?? '—'}</td>
                            <td dir="ltr">{l.approvalNo ?? '—'}</td>
                            <td dir="ltr">{fromPiastres(l.amount)}</td>
                            <td>{l.rejectedReason ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table></div>

      {settling && (
        <SettleDialog
          claim={settling}
          onClose={(done) => {
            setSettling(null);
            if (done) {
              showToast(t.settled);
              void loadClaims();
            }
          }}
        />
      )}
    </>
  );
}

function SettleDialog({ claim, onClose }: { claim: ClaimRow; onClose: (done: boolean) => void }) {
  const { busy, run } = useBusy();
  const [lines, setLines] = useState<ClaimLineRow[]>([]);
  const [rejected, setRejected] = useState<Map<number, string>>(new Map());
  const [paid, setPaid] = useState<number | null>(claim.totalClaimed);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void window.api!.insurance.claimLines(claim.id).then(setLines);
  }, [claim.id]);

  const rejectedTotal = lines.filter((l) => rejected.has(l.invoiceId)).reduce((s, l) => s + l.amount, 0);

  async function submit() {
    setError(null);
    if (paid === null) return setError(ar.common.required);
    if ([...rejected.values()].some((r) => !r.trim())) return setError(ar.errors['insurance.rejectReasonRequired']);
    // What the company paid plus what it rejected cannot exceed the claim.
    if (paid + rejectedTotal > claim.totalClaimed) {
      return setError(ar.errors['insurance.overpaid'].replace('{claimed}', fromPiastres(claim.totalClaimed)));
    }
    try {
      await window.api!.insurance.settleClaim(claim.id, {
        paid,
        rejections: [...rejected.entries()].map(([invoiceId, reason]) => ({ invoiceId, reason })),
        notes: notes.trim() || null,
      });
      onClose(true);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onKeyDown={(e) => e.code === 'Escape' && onClose(false)}>
      <div className="modal modal--wide panel stack">
        <h2 className="section-heading">{t.settleTitle.replace('{serial}', String(claim.serial))}</h2>
        {error && <div className="alert alert--error">{error}</div>}
        <div className="table-wrap"><table className="subtable">
          <thead>
            <tr>
              <th>{t.reject}</th>
              <th>{t.invoice}</th>
              <th>{t.amount}</th>
              <th>{t.rejectReason}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="center">
                  <input
                    type="checkbox"
                    checked={rejected.has(l.invoiceId)}
                    onChange={(e) => {
                      const next = new Map(rejected);
                      if (e.target.checked) next.set(l.invoiceId, '');
                      else next.delete(l.invoiceId);
                      setRejected(next);
                      setPaid(claim.totalClaimed - lines.filter((x) => next.has(x.invoiceId)).reduce((s, x) => s + x.amount, 0));
                    }}
                  />
                </td>
                <td dir="ltr">{l.serial}</td>
                <td dir="ltr">{fromPiastres(l.amount)}</td>
                <td>
                  {rejected.has(l.invoiceId) && (
                    <input
                      className="field field--sm"
                      value={rejected.get(l.invoiceId)}
                      onChange={(e) => setRejected(new Map(rejected).set(l.invoiceId, e.target.value))}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{t.paidAmount}</span>
            <MoneyInput value={paid} onChange={setPaid} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{t.notes}</span>
            <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <div className="stats">
          <Stat label={t.claimed} value={fromPiastres(claim.totalClaimed)} neutral />
          <Stat label={t.totalRejected} value={fromPiastres(rejectedTotal)} bad={rejectedTotal > 0} />
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void run(submit)}>
            {t.settle}
          </button>
          <button type="button" className="btn" onClick={() => onClose(false)}>
            {ar.common.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ReceivablesTab() {
  const [rows, setRows] = useState<InsuranceReceivableRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void window.api!.insurance.receivables().then(setRows).catch((err) => setError(errorText(err)));
  }, []);
  return (
    <>
      {error && <div className="alert alert--error">{error}</div>}
      <div className="table-wrap"><table className="datatable">
        <thead>
          <tr>
            <th>{t.company}</th>
            <th>{t.unclaimed}</th>
            <th>{t.pending}</th>
            <th>{t.shortPaid}</th>
            <th>{t.totalRejected}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.companyId}>
              <td>{r.companyName}</td>
              <td dir="ltr">{fromPiastres(r.unclaimed)}</td>
              <td dir="ltr" className="strong">{fromPiastres(r.pending)}</td>
              <td dir="ltr">{fromPiastres(r.shortPaid)}</td>
              <td dir="ltr" className={r.rejected > 0 ? 'text-bad' : ''}>{fromPiastres(r.rejected)}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </>
  );
}
