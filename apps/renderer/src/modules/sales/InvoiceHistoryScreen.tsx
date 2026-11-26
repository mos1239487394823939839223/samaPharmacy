/**
 * سجل فواتير البيع — find any invoice (by date or serial), see its lines and
 * prescription, reprint the receipt (marked as a reprint), or void a draft /
 * held invoice. A confirmed invoice is never voided here — that is a return.
 */

import { Fragment, useEffect, useState } from 'react';
import type { InvoiceSearchRow, SalesLineRow } from '@pharmacy/shared';
import { addDays, fromPiastres, toAsciiDigits, todayLocal, fromPiastresGrouped } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { errorText } from '../../lib/errors';
import { useToast } from '../../components/Toast';
import { exportCsv } from '../../lib/csv';

const STATUS: Record<string, string> = {
  draft: ar.sales.statusDraft,
  held: ar.sales.statusHeld,
  confirmed: ar.sales.statusConfirmed,
  voided: ar.sales.statusVoided,
};

export function InvoiceHistoryScreen() {
  const [from, setFrom] = useState(() => addDays(todayLocal(), -7));
  const [to, setTo] = useState(() => todayLocal());
  const [serial, setSerial] = useState('');
  const [rows, setRows] = useState<InvoiceSearchRow[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [lines, setLines] = useState<Array<SalesLineRow & { name?: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function load() {
    setError(null);
    try {
      const n = Number(toAsciiDigits(serial.trim()));
      setRows(await window.api!.sales.search(serial.trim() && Number.isInteger(n) ? { serial: n } : { from, to }));
    } catch (err) {
      setError(errorText(err));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(row: InvoiceSearchRow) {
    if (open === row.id) return setOpen(null);
    setOpen(row.id);
    const invoice = await window.api!.sales.get(row.id);
    const names = new Map<number, string>();
    for (const id of new Set(invoice?.lines.map((l) => l.itemId) ?? [])) {
      const item = await window.api!.items.get(id);
      if (item) names.set(id, item.nameAr);
    }
    setLines((invoice?.lines ?? []).map((l) => ({ ...l, name: names.get(l.itemId) })));
  }

  async function act(row: InvoiceSearchRow, action: 'print' | 'reprint' | 'void') {
    setError(null);
    try {
      if (action === 'print') {
        await window.api!.print.document('sale', row.id);
      } else if (action === 'reprint') {
        await window.api!.print.receipt(row.id, true);
        showToast(ar.invoices.printed);
      } else {
        if (!window.confirm(ar.invoices.voidConfirm)) return;
        await window.api!.sales.voidInvoice(row.id);
        showToast(ar.invoices.voided);
        await load();
      }
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function exportRows() {
    const msg = await exportCsv(
      `invoices-${from}-${to}.csv`,
      [ar.invoices.serial, ar.invoices.date, ar.invoices.customer, ar.invoices.cashier, ar.invoices.type, ar.invoices.status, ar.invoices.total],
      rows.map((r) => [
        r.serial,
        r.confirmedAt ?? r.createdAt,
        r.customerName ?? ar.invoices.walkIn,
        r.userName ?? '',
        r.invoiceType === 'cash' ? ar.sales.cash : ar.sales.credit,
        STATUS[r.status] ?? r.status,
        fromPiastres(r.total),
      ])
    );
    if (msg) showToast(msg, 'info');
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.invoices.serial}</span>
            <input
              className="field"
              dir="ltr"
              autoFocus
              value={serial}
              onChange={(e) => setSerial(toAsciiDigits(e.target.value))}
              onKeyDown={(e) => (e.code === 'Enter' || e.code === 'NumpadEnter') && void load()}
            />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.invoices.from}</span>
            <input className="field" type="date" dir="ltr" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="formfield">
            <span className="formfield__label">{ar.invoices.to}</span>
            <input className="field" type="date" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => void load()}>
            {ar.invoices.apply}
          </button>
          <button type="button" className="btn btn--sm" disabled={rows.length === 0} onClick={() => void exportRows()}>
            {ar.invoices.export}
          </button>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {rows.length === 0 ? (
        <p className="muted">{ar.invoices.empty}</p>
      ) : (
        <div className="table-wrap"><table className="datatable">
          <thead>
            <tr>
              <th>{ar.invoices.serial}</th>
              <th>{ar.invoices.date}</th>
              <th>{ar.invoices.customer}</th>
              <th>{ar.invoices.cashier}</th>
              <th>{ar.invoices.type}</th>
              <th>{ar.invoices.status}</th>
              <th>{ar.invoices.total}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td dir="ltr">{r.serial}</td>
                  <td dir="ltr">{(r.confirmedAt ?? r.createdAt).slice(0, 16)}</td>
                  <td>{r.customerName ?? ar.invoices.walkIn}</td>
                  <td>{r.userName ?? '—'}</td>
                  <td>{r.invoiceType === 'cash' ? ar.sales.cash : ar.sales.credit}</td>
                  <td>{STATUS[r.status] ?? r.status}</td>
                  <td dir="ltr" className="strong">{fromPiastresGrouped(r.total)}</td>
                  <td className="datatable__actions">
                    <button type="button" className="btn btn--sm" onClick={() => void toggle(r)}>
                      {ar.invoices.view}
                    </button>
                    <button type="button" className="btn btn--sm" onClick={() => void act(r, 'print')}>
                      {ar.print.a4}
                    </button>
                    {r.status === 'confirmed' && (
                      <button type="button" className="btn btn--sm" onClick={() => void act(r, 'reprint')}>
                        {ar.invoices.reprint}
                      </button>
                    )}
                    {(r.status === 'draft' || r.status === 'held') && (
                      <button type="button" className="btn btn--danger btn--sm" onClick={() => void act(r, 'void')}>
                        {ar.invoices.void}
                      </button>
                    )}
                  </td>
                </tr>
                {open === r.id && (
                  <tr>
                    <td colSpan={8}>
                      <div className="table-wrap"><table className="subtable">
                        <tbody>
                          {lines.map((l) => (
                            <tr key={l.id}>
                              <td>{l.name ?? l.itemId}</td>
                              <td dir="ltr">{l.qtyInUnit}</td>
                              <td dir="ltr">{fromPiastresGrouped(l.unitPrice)}</td>
                              <td dir="ltr">{fromPiastresGrouped(l.valueAfterDiscount)}</td>
                              <td dir="ltr" className="muted">{l.expiryDate ?? ''}</td>
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
      )}
    </div>
  );
}
