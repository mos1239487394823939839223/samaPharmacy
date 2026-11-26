/**
 * سجل المخدرات — the register (spec M7): every movement of a scheduled item
 * with its running balance, printable in logbook form, plus the
 * reconciliation of register balance against physical stock.
 *
 * A wrong prescription detail is corrected by a reversal + corrected entry
 * (never an edit), and needs a second signature from another permitted user.
 */

import { useEffect, useRef, useState } from 'react';
import type { ItemListRow, NarcoticsReconciliationRow, NarcoticsRow } from '@pharmacy/shared';
import { addDays, todayLocal } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { errorText } from '../../lib/errors';
import { useToast } from '../../components/Toast';
import { PrescriptionDialog } from '../../components/PrescriptionDialog';
import { exportCsv } from '../../lib/csv';
import { SearchInput } from '../../components/SearchInput';
import { EmptyState } from '../../components/EmptyState';

type Tab = 'register' | 'reconciliation';

export function NarcoticsScreen() {
  const [tab, setTab] = useState<Tab>('register');
  const [from, setFrom] = useState(() => addDays(todayLocal(), -30));
  const [to, setTo] = useState(() => todayLocal());
  const [item, setItem] = useState<ItemListRow | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItemListRow[]>([]);
  const [rows, setRows] = useState<NarcoticsRow[]>([]);
  const [recon, setRecon] = useState<NarcoticsReconciliationRow[]>([]);
  const [fixing, setFixing] = useState<NarcoticsRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  async function load() {
    setError(null);
    try {
      if (tab === 'register') setRows(await window.api!.narcotics.register({ itemId: item?.id, from, to }));
      else setRecon(await window.api!.narcotics.reconciliation());
    } catch (err) {
      setError(errorText(err));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, item]);

  useEffect(() => {
    if (!query.trim()) return setResults([]);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void window.api!.items.search(query, 10).then(setResults), 120);
  }, [query]);

  const reversed = new Set(rows.filter((r) => r.reversesId).map((r) => r.reversesId));
  const dir = ar.narcotics.directions as Record<string, string>;

  async function exportRegister() {
    const msg = await exportCsv(
      `narcotics-${from}-${to}.csv`,
      [ar.narcotics.serial, ar.narcotics.at, ar.narcotics.item, ar.narcotics.direction, ar.narcotics.qty, ar.narcotics.balance,
        ar.narcotics.prescriptionNo, ar.narcotics.doctor, ar.narcotics.syndicateNo, ar.narcotics.patient, ar.narcotics.patientId, ar.narcotics.reason],
      rows.map((r) => [r.serial, r.at, r.itemName, dir[r.direction], r.qtyBase, r.balanceAfter, r.prescriptionNo, r.doctorName,
        r.doctorSyndicateNo, r.patientName, r.patientIdNo, r.reason])
    );
    if (msg) showToast(msg, 'info');
  }

  return (
    <div className="stack">
      <div className="btn-row no-print" style={{ marginBlockStart: 0 }}>
        <button type="button" className={tab === 'register' ? 'btn btn--primary btn--sm' : 'btn btn--sm'} onClick={() => setTab('register')}>
          {ar.narcotics.title}
        </button>
        <button type="button" className={tab === 'reconciliation' ? 'btn btn--primary btn--sm' : 'btn btn--sm'} onClick={() => setTab('reconciliation')}>
          {ar.narcotics.reconciliation}
        </button>
        <button type="button" className="btn btn--sm" onClick={() => window.print()}>
          {ar.narcotics.print}
        </button>
        {tab === 'register' && (
          <button type="button" className="btn btn--sm" disabled={rows.length === 0} onClick={() => void exportRegister()}>
            {ar.exportCsv.button}
          </button>
        )}
      </div>
      {error && <div className="alert alert--error">{error}</div>}

      {tab === 'register' && (
        <>
          <div className="panel no-print">
            <div className="grid2">
              <label className="formfield">
                <span className="formfield__label">{ar.audit.from}</span>
                <input className="field" type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="formfield">
                <span className="formfield__label">{ar.audit.to}</span>
                <input className="field" type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />
              </label>
              <div className="formfield field-wrap">
                <span className="formfield__label">{ar.narcotics.item}</span>
                {item ? (
                  <div className="btn-row" style={{ marginBlockStart: 0 }}>
                    <span className="strong">{item.nameAr}</span>
                    <button type="button" className="btn btn--sm" onClick={() => setItem(null)}>
                      {ar.narcotics.allItems}
                    </button>
                  </div>
                ) : (
                  <>
                    <SearchInput className="field" value={query} placeholder={ar.narcotics.allItems} onChange={(e) => setQuery(e.target.value)} />
                    {results.length > 0 && (
                      <ul className="autocomplete">
                        {results.map((r) => (
                          <li key={r.id}>
                            <button type="button" onClick={() => { setItem(r); setQuery(''); setResults([]); }}>
                              {r.nameAr}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="btn-row">
              <button type="button" className="btn btn--primary btn--sm" onClick={() => void load()}>
                {ar.audit.apply}
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <EmptyState title={ar.narcotics.noEntries} hint={ar.narcotics.noEntriesHint} />
          ) : (
            <div className="table-wrap"><table className="datatable small">
              <thead>
                <tr>
                  <th>{ar.narcotics.serial}</th>
                  <th>{ar.narcotics.at}</th>
                  <th>{ar.narcotics.item}</th>
                  <th>{ar.narcotics.direction}</th>
                  <th>{ar.narcotics.qty}</th>
                  <th>{ar.narcotics.balance}</th>
                  <th>{ar.narcotics.prescriptionNo}</th>
                  <th>{ar.narcotics.doctor}</th>
                  <th>{ar.narcotics.patient}</th>
                  <th>{ar.narcotics.patientId}</th>
                  <th className="no-print" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={reversed.has(r.id) ? 'muted' : ''}>
                    <td dir="ltr">{r.serial}</td>
                    <td dir="ltr">{r.at.slice(0, 16)}</td>
                    <td>{r.itemName}</td>
                    <td>
                      {dir[r.direction]}
                      {r.reason && <div className="small muted">{r.reason}</div>}
                    </td>
                    <td dir="ltr">{r.qtyBase}</td>
                    <td dir="ltr" className="strong">{r.balanceAfter}</td>
                    <td dir="ltr">{r.prescriptionNo ?? '—'}</td>
                    <td>
                      {r.doctorName ?? '—'}
                      {r.doctorSyndicateNo && <div className="small muted" dir="ltr">{r.doctorSyndicateNo}</div>}
                    </td>
                    <td>{r.patientName ?? '—'}</td>
                    <td dir="ltr">{r.patientIdNo ?? '—'}</td>
                    <td className="no-print">
                      {r.direction === 'out' && r.prescriptionNo && !reversed.has(r.id) && (
                        <button type="button" className="btn btn--sm" onClick={() => setFixing(r)}>
                          {ar.narcotics.fix}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </>
      )}

      {tab === 'reconciliation' &&
        (recon.length === 0 ? (
          <p className="muted">{ar.narcotics.noScheduled}</p>
        ) : (
          <div className="table-wrap"><table className="datatable">
            <thead>
              <tr>
                <th>{ar.narcotics.item}</th>
                <th>{ar.narcotics.registerBalance}</th>
                <th>{ar.narcotics.physical}</th>
                <th>{ar.narcotics.difference}</th>
              </tr>
            </thead>
            <tbody>
              {recon.map((r) => (
                <tr key={r.itemId}>
                  <td>{r.nameAr}</td>
                  <td dir="ltr">{r.registerBalance ?? '—'}</td>
                  <td dir="ltr">{r.physicalQty}</td>
                  <td dir="ltr" className={r.difference ? 'text-bad' : 'muted'}>
                    {r.difference === null ? '—' : r.difference === 0 ? ar.narcotics.matched : r.difference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ))}

      {fixing && (
        <PrescriptionDialog
          title={ar.narcotics.fixTitle}
          intro={ar.narcotics.fixHint}
          withReason
          submitLabel={ar.narcotics.fix}
          initial={{
            prescriptionNo: fixing.prescriptionNo ?? '',
            doctorName: fixing.doctorName ?? '',
            doctorSyndicateNo: fixing.doctorSyndicateNo ?? '',
            patientName: fixing.patientName ?? '',
            patientIdNo: fixing.patientIdNo ?? '',
          }}
          onCancel={() => setFixing(null)}
          onSubmit={(details, reason) => {
            const entry = fixing;
            setFixing(null);
            void (async () => {
              try {
                await window.api!.narcotics.fix(entry.id, details, reason);
                showToast(ar.narcotics.fixed);
                await load();
              } catch (err) {
                setError(errorText(err));
              }
            })();
          }}
        />
      )}
    </div>
  );
}
