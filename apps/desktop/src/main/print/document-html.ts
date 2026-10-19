/**
 * Full-page (A4) invoice — sales and purchase invoices and both kinds of
 * return. Shown in a preview window with its own «طباعة» button, which opens
 * the Windows print dialog: any installed printer works (or "Microsoft Print
 * to PDF"), independent of the receipt-printer setup in Settings.
 */

import { fromPiastres, code128Svg } from '@pharmacy/core';
import type { PharmacyProfile, PrintableDocument } from '@pharmacy/shared';
import { esc, FONT_FACES } from './receipt-html';

/** Printed text. Lives with the template: the main process has no access to the renderer's i18n bundle. */
const T = {
  titles: {
    sale: 'فاتورة بيع',
    purchase: 'فاتورة شراء',
    salesReturn: 'مرتجع بيع',
    purchaseReturn: 'مرتجع شراء',
  },
  party: { sale: 'العميل', purchase: 'المورد', salesReturn: 'العميل', purchaseReturn: 'المورد' },
  reference: { sale: '', purchase: 'رقم فاتورة المورد', salesReturn: 'عن فاتورة بيع رقم', purchaseReturn: 'عن فاتورة شراء رقم' },
  payment: { cash: 'نقدي', credit: 'آجل', account: 'على الحساب' } as Record<string, string>,
  status: { draft: 'مسودة — غير مرحّلة', void: 'ملغاة', held: 'معلّقة' } as Record<string, string>,
  serial: 'رقم',
  date: 'التاريخ',
  paymentType: 'طريقة الدفع',
  walkIn: 'عميل نقدي',
  phone: 'تليفون',
  item: 'الصنف',
  unit: 'الوحدة',
  qty: 'الكمية',
  price: 'السعر',
  total: 'الإجمالي',
  details: 'بيان',
  subtotal: 'الإجمالي قبل الخصم',
  discount: 'الخصم',
  extra: { sale: 'إضافات', purchase: 'مصروفات' } as Record<string, string>,
  tax: 'الضريبة',
  grand: 'الصافي',
  insurance: 'نصيب شركة التأمين',
  patient: 'المطلوب من المريض',
  notes: 'ملاحظات',
  license: 'ترخيص',
  taxNo: 'رقم ضريبي',
  signature: 'التوقيع',
  print: 'طباعة (Ctrl+P)',
  close: 'إغلاق (Esc)',
  currency: 'ج.م',
};

export function documentTitle(d: PrintableDocument): string {
  return `${T.titles[d.kind]} ${d.serial}`;
}

export function documentHtml(d: PrintableDocument, pharmacy: PharmacyProfile): string {
  const money = (p: number) => fromPiastres(p);
  const hasNotes = d.lines.some((l) => l.note);
  const statusNote = T.status[d.status];
  const extraLabel = T.extra[d.kind];

  const totals: Array<[string, number, boolean?]> = [];
  if (d.discount || d.extra || d.tax) totals.push([T.subtotal, d.subtotal]);
  if (d.discount) totals.push([T.discount, -d.discount]);
  if (d.extra && extraLabel) totals.push([extraLabel, d.extra]);
  if (d.tax) totals.push([T.tax, d.tax]);
  totals.push([T.grand, d.total, true]);
  if (d.kind === 'sale' && d.insuranceShare) {
    totals.push([`${T.insurance}${d.insuranceCompany ? ` (${d.insuranceCompany})` : ''}`, d.insuranceShare]);
    totals.push([T.patient, d.total - d.insuranceShare, true]);
  }

  const meta: Array<[string, string]> = [
    [T.serial, String(d.serial)],
    [T.date, d.date.slice(0, 16).replace('T', ' ')],
  ];
  if (d.paymentType) meta.push([T.paymentType, T.payment[d.paymentType] ?? d.paymentType]);
  const refLabel = T.reference[d.kind];
  if (refLabel && d.reference) meta.push([refLabel, d.reference]);

  const party = d.partyName ?? (d.kind === 'sale' ? T.walkIn : '');

  return `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(documentTitle(d))}</title>
<style>
${FONT_FACES}
@page { size: A4; margin: 14mm 12mm; }
* { box-sizing: border-box; }
html, body { margin: 0; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; color: #101828; background: #eef0f4; }
.bar { position: sticky; top: 0; display: flex; gap: 8px; justify-content: center; padding: 10px; background: #fff; border-bottom: 1px solid #e4e7ec; }
.bar button:focus-visible { outline: 3px solid #94b3fd; outline-offset: 2px; }
.bar button { font: inherit; font-size: 14px; font-weight: 700; padding: 8px 22px; border-radius: 8px; border: 1px solid #d0d5dd; background: #fff; cursor: pointer; }
.bar .primary { background: #2145c7; border-color: #2145c7; color: #fff; }
.page { width: 210mm; min-height: 297mm; margin: 16px auto; padding: 14mm 12mm; background: #fff; box-shadow: 0 2px 12px rgba(16,24,40,.08); }
header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 12px; border-bottom: 2px solid #101828; }
.ph h1 { margin: 0 0 4px; font-size: 22px; }
.ph div { font-size: 12px; color: #475467; line-height: 1.7; }
.doc { text-align: left; }
.doc h2 { margin: 0 0 6px; font-size: 20px; text-align: right; }
.doc svg { height: 34px; width: auto; display: block; margin-inline-start: auto; }
.status { display: inline-block; margin-top: 4px; padding: 2px 10px; border-radius: 99px; background: #fef3f2; color: #b42318; font-size: 12px; font-weight: 700; }
.info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 14px 0; }
.box { border: 1px solid #e4e7ec; border-radius: 8px; padding: 10px 12px; font-size: 13px; }
.box dl { display: grid; grid-template-columns: auto 1fr; gap: 3px 12px; margin: 0; }
.box dt { color: #667085; } .box dd { margin: 0; font-weight: 700; }
.box .label { color: #667085; font-size: 12px; } .box .party { font-size: 15px; font-weight: 700; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { background: #f2f4f7; text-align: right; font-weight: 700; padding: 7px 8px; border-bottom: 1px solid #d0d5dd; }
td { padding: 7px 8px; border-bottom: 1px solid #eaecf0; vertical-align: top; }
td.n, th.n { text-align: left; font-variant-numeric: tabular-nums; white-space: nowrap; direction: ltr; }
td.i { color: #98a2b3; width: 28px; }
.sub { font-size: 11px; color: #667085; direction: ltr; text-align: right; }
.totals { width: 300px; margin: 14px 0 0 auto; margin-inline-start: auto; margin-inline-end: 0; font-size: 13px; }
.totals div { display: flex; justify-content: space-between; padding: 5px 2px; border-bottom: 1px solid #eaecf0; }
.totals .strong { font-size: 15px; font-weight: 700; border-bottom: 2px solid #101828; }
.totals span:last-child { direction: ltr; font-variant-numeric: tabular-nums; }
.notes { margin-top: 14px; font-size: 13px; color: #344054; }
footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; color: #667085; }
.sign { border-top: 1px solid #98a2b3; padding-top: 4px; width: 180px; text-align: center; }
@media print {
  html, body { background: #fff; }
  .bar { display: none; }
  .page { width: auto; min-height: 0; margin: 0; padding: 0; box-shadow: none; }
  tr { break-inside: avoid; }
}
</style></head>
<body>
<div class="bar">
  <button class="primary" id="print">${T.print}</button>
  <button id="close">${T.close}</button>
</div>
<div class="page">
  <header>
    <div class="ph">
      <h1>${esc(pharmacy.name || '')}</h1>
      <div>
        ${pharmacy.address ? `${esc(pharmacy.address)}<br>` : ''}
        ${pharmacy.phone ? `${T.phone}: <span dir="ltr">${esc(pharmacy.phone)}</span><br>` : ''}
        ${pharmacy.licenseNo ? `${T.license}: ${esc(pharmacy.licenseNo)}` : ''}
        ${pharmacy.taxNumber ? ` · ${T.taxNo}: ${esc(pharmacy.taxNumber)}` : ''}
      </div>
    </div>
    <div class="doc">
      <h2>${T.titles[d.kind]}</h2>
      ${code128Svg(String(d.serial))}
      ${statusNote ? `<div class="status">${statusNote}</div>` : ''}
    </div>
  </header>

  <div class="info">
    <div class="box">
      <div class="label">${T.party[d.kind]}</div>
      <div class="party">${esc(party)}</div>
      ${d.partyPhone ? `<div dir="ltr" style="text-align:right">${esc(d.partyPhone)}</div>` : ''}
    </div>
    <div class="box"><dl>${meta.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>
  </div>

  <table>
    <thead><tr>
      <th class="i">#</th><th>${T.item}</th><th>${T.unit}</th>
      <th class="n">${T.qty}</th><th class="n">${T.price}</th><th class="n">${T.total}</th>
    </tr></thead>
    <tbody>
      ${d.lines
        .map(
          (l, i) => `<tr>
        <td class="i">${i + 1}</td>
        <td>${esc(l.name)}${hasNotes && l.note ? `<div class="sub">${esc(l.note)}</div>` : ''}</td>
        <td>${esc(l.unitName)}</td>
        <td class="n">${l.qty}</td>
        <td class="n">${money(l.unitPrice)}</td>
        <td class="n">${money(l.total)}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    ${totals
      .map(([k, v, strong]) => `<div class="${strong ? 'strong' : ''}"><span>${esc(k)}</span><span>${money(v)} ${T.currency}</span></div>`)
      .join('')}
  </div>

  ${d.notes ? `<div class="notes"><b>${T.notes}:</b> ${esc(d.notes)}</div>` : ''}

  <footer>
    <div>${d.kind === 'sale' || d.kind === 'salesReturn' ? esc(pharmacy.receiptFooter || '') : ''}</div>
    <div class="sign">${T.signature}</div>
  </footer>
</div>
<script>
  document.getElementById('print').addEventListener('click', () => window.print());
  document.getElementById('close').addEventListener('click', () => window.close());
  // Physical keys (event.code), never event.key — the Arabic layout rule.
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') window.close();
    if (e.code === 'KeyP' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); window.print(); }
  });
  document.fonts.ready.then(() => document.getElementById('print').focus());
</script>
</body></html>`;
}
