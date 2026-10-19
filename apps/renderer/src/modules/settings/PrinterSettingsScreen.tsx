/**
 * الطابعة والإيصال — receipt header (pharmacy name, address, licence, tax
 * no.) and the receipt printer (hardware doc §2.7): route, paper, copies,
 * auto-print, cash drawer, and a test-print button so installation is a
 * five-minute job. Failed print jobs are listed here with a retry.
 */

import { useEffect, useState } from 'react';
import type { PharmacyProfile, PrinterSettings, PrinterStatus } from '@pharmacy/shared';
import { toAsciiDigits } from '@pharmacy/core';
import { ar } from '../../i18n/ar';
import { useToast } from '../../components/Toast';
import { errorText } from '../../lib/errors';
import { pharmacyNameChanged } from '../../lib/pharmacyName';
import { useRefreshOnActivate } from '../../lib/workspace';

export function PrinterSettingsScreen() {
  const [pharmacy, setPharmacy] = useState<PharmacyProfile | null>(null);
  const [printer, setPrinter] = useState<PrinterSettings | null>(null);
  const [printers, setPrinters] = useState<string[]>([]);
  const [status, setStatus] = useState<PrinterStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  async function load() {
    try {
      const s = await window.api!.settings.get();
      setPharmacy(s.pharmacy);
      setPrinter(s.printer);
      setStatus(await window.api!.print.status());
      setPrinters(await window.api!.print.listPrinters());
    } catch (err) {
      setError(errorText(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);
  // The name may have been renamed from the header since this page loaded.
  useRefreshOnActivate(() => void load());

  async function run(work: () => Promise<unknown>, done?: string) {
    setError(null);
    try {
      await work();
      if (done) showToast(done);
      setStatus(await window.api!.print.status());
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (!pharmacy || !printer) return error ? <div className="alert alert--error">{error}</div> : <p className="muted">{ar.items.loading}</p>;

  const setP = (patch: Partial<PharmacyProfile>) => setPharmacy({ ...pharmacy, ...patch });
  const setR = (patch: Partial<PrinterSettings>) => setPrinter({ ...printer, ...patch });
  const escpos = printer.mode === 'network' || printer.mode === 'share';

  return (
    <div className="stack">
      {error && <div className="alert alert--error">{error}</div>}

      <fieldset className="fieldset">
        <legend>{ar.printer.pharmacy}</legend>
        <div className="grid2">
          {(['name', 'address', 'phone', 'licenseNo', 'taxNumber', 'receiptFooter'] as const).map((key) => (
            <label key={key} className="formfield">
              <span className="formfield__label">{ar.printer[key === 'receiptFooter' ? 'footer' : key]}</span>
              <input className="field" value={pharmacy[key]} onChange={(e) => setP({ [key]: e.target.value })} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="fieldset">
        <legend>{ar.printer.printerSection}</legend>
        <p className="hint">{ar.printer.modeHint}</p>
        <div className="grid2">
          <label className="formfield">
            <span className="formfield__label">{ar.printer.mode}</span>
            <select className="field" value={printer.mode} onChange={(e) => setR({ mode: e.target.value as PrinterSettings['mode'] })}>
              {(['none', 'system', 'network', 'share'] as const).map((m) => (
                <option key={m} value={m}>
                  {ar.printer.modes[m]}
                </option>
              ))}
            </select>
          </label>

          {printer.mode === 'system' && (
            <label className="formfield">
              <span className="formfield__label">{ar.printer.device}</span>
              <select className="field" value={printer.deviceName} onChange={(e) => setR({ deviceName: e.target.value })}>
                <option value="">—</option>
                {printers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          )}
          {printer.mode === 'network' && (
            <>
              <label className="formfield">
                <span className="formfield__label">{ar.printer.host}</span>
                <input className="field" dir="ltr" value={printer.host} onChange={(e) => setR({ host: e.target.value.trim() })} />
              </label>
              <label className="formfield">
                <span className="formfield__label">{ar.printer.port}</span>
                <input
                  className="field field--sm"
                  dir="ltr"
                  value={printer.port}
                  onChange={(e) => setR({ port: Number(toAsciiDigits(e.target.value)) || 9100 })}
                />
              </label>
            </>
          )}
          {printer.mode === 'share' && (
            <label className="formfield">
              <span className="formfield__label">{ar.printer.shareName}</span>
              <input className="field" dir="ltr" value={printer.shareName} onChange={(e) => setR({ shareName: e.target.value.trim() })} />
            </label>
          )}

          {printer.mode !== 'none' && (
            <>
              <label className="formfield">
                <span className="formfield__label">{ar.printer.format}</span>
                <select
                  className="field"
                  value={printer.format}
                  disabled={escpos}
                  onChange={(e) => setR({ format: e.target.value as PrinterSettings['format'] })}
                >
                  <option value="receipt">{ar.printer.formats.receipt}</option>
                  <option value="a5">{ar.printer.formats.a5}</option>
                </select>
              </label>
              <label className="formfield">
                <span className="formfield__label">{ar.printer.paperWidth}</span>
                <select className="field" value={printer.paperWidth} onChange={(e) => setR({ paperWidth: Number(e.target.value) as 58 | 80 })}>
                  <option value={80}>80mm</option>
                  <option value={58}>58mm</option>
                </select>
              </label>
              <label className="formfield">
                <span className="formfield__label">{ar.printer.copies}</span>
                <input
                  className="field field--sm"
                  dir="ltr"
                  value={printer.copies}
                  onChange={(e) => setR({ copies: Math.min(5, Math.max(1, Number(toAsciiDigits(e.target.value)) || 1)) })}
                />
              </label>
            </>
          )}
        </div>

        {printer.mode !== 'none' && (
          <div className="stack-sm">
            <label className="checkbox">
              <input type="checkbox" checked={printer.autoPrint} onChange={(e) => setR({ autoPrint: e.target.checked })} />
              <span>{ar.printer.autoPrint}</span>
            </label>
            {escpos && (
              <>
                <label className="checkbox">
                  <input type="checkbox" checked={printer.openDrawer} onChange={(e) => setR({ openDrawer: e.target.checked })} />
                  <span>{ar.printer.openDrawer}</span>
                </label>
                <label className="formfield formfield--narrow">
                  <span className="formfield__label">{ar.printer.drawerPin}</span>
                  <select
                    className="field field--sm"
                    value={String(printer.drawerPin)}
                    onChange={(e) => setR({ drawerPin: e.target.value === 'auto' ? 'auto' : (Number(e.target.value) as 2 | 5) })}
                  >
                    <option value="auto">auto</option>
                    <option value="2">2</option>
                    <option value="5">5</option>
                  </select>
                </label>
              </>
            )}
          </div>
        )}
      </fieldset>

      <div className="btn-row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => void run(async () => {
            await window.api!.settings.update({ pharmacy, printer });
            pharmacyNameChanged(pharmacy.name);
          }, ar.printer.saved)}
        >
          {ar.printer.save}
        </button>
        <button type="button" className="btn" disabled={printer.mode === 'none'} onClick={() => void run(() => window.api!.print.test(), ar.printer.testSent)}>
          {ar.printer.test}
        </button>
        {escpos && (
          <button type="button" className="btn" onClick={() => void run(() => window.api!.print.openDrawer())}>
            {ar.printer.openDrawerNow}
          </button>
        )}
        {printer.mode === 'system' && (
          <button type="button" className="btn" onClick={() => void window.api!.print.listPrinters().then(setPrinters)}>
            {ar.printer.refresh}
          </button>
        )}
      </div>

      <fieldset className="fieldset">
        <legend>{ar.printer.failedJobs}</legend>
        {!status || status.failed.length === 0 ? (
          <p className="muted">{ar.printer.noFailed}</p>
        ) : (
          <>
            <ul className="small">
              {status.failed.map((f) => (
                <li key={f.id} dir="ltr">
                  {f.createdAt.slice(0, 19)} — {f.lastError}
                </li>
              ))}
            </ul>
            <button type="button" className="btn btn--sm" onClick={() => void run(() => window.api!.print.retryFailed())}>
              {ar.printer.retry}
            </button>
          </>
        )}
      </fieldset>
    </div>
  );
}
