/**
 * Receipt HTML (hardware doc §2.6). Rendered by Chromium, so Arabic is shaped
 * and right-to-left — then either printed through the Windows driver or
 * rasterised to ESC/POS (escpos.ts). The Cairo font is embedded as data URIs
 * so the receipt never depends on fonts installed on the till.
 */

import { code128Svg } from '@pharmacy/core';
import type { PharmacyProfile, PrinterSettings } from '@pharmacy/shared';
import cairo400 from '@fontsource/cairo/files/cairo-arabic-400-normal.woff2?inline';
import cairo700 from '@fontsource/cairo/files/cairo-arabic-700-normal.woff2?inline';
import cairoLatin400 from '@fontsource/cairo/files/cairo-latin-400-normal.woff2?inline';

export interface ReceiptLine {
  name: string;
  unitName: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface ReceiptData {
  serial: number;
  status: string;
  invoiceType: 'cash' | 'credit';
  dateTime: string;
  cashier: string;
  customerName: string | null;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  extraCharge: number;
  total: number;
  insuranceShare: number;
  insuranceCompany: string | null;
  patientPays: number;
  tendered: number | null;
  change: number;
}

/** Printable width in CSS px for 203-dpi roll paper. */
export const PAPER_PX = { 58: 384, 80: 576 } as const;

const egp = (piastres: number) => (piastres / 100).toFixed(2);

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export const FONT_FACES = `
  @font-face { font-family:'Cairo'; src:url('${cairo400}') format('woff2'); font-weight:400; unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF; }
  @font-face { font-family:'Cairo'; src:url('${cairo700}') format('woff2'); font-weight:700; unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF; }
  @font-face { font-family:'Cairo'; src:url('${cairoLatin400}') format('woff2'); font-weight:400 700; unicode-range:U+0000-00FF; }
`;

export function receiptHtml(
  d: ReceiptData,
  pharmacy: PharmacyProfile,
  printer: Pick<PrinterSettings, 'paperWidth' | 'format'>,
  opts: { reprint?: boolean; returnWindowDays?: number } = {}
): string {
  const a5 = printer.format === 'a5';
  const width = a5 ? '100%' : `${PAPER_PX[printer.paperWidth]}px`;
  const base = a5 ? 14 : printer.paperWidth === 58 ? 16 : 19;

  const rows = d.lines
    .map(
      (l) => `<tr>
        <td class="n">${esc(l.name)}</td>
        <td class="c">${l.qty} ${esc(l.unitName)}</td>
        <td class="c">${egp(l.unitPrice)}</td>
        <td class="c">${egp(l.total)}</td>
      </tr>`
    )
    .join('');

  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<style>
  ${FONT_FACES}
  @page { margin: ${a5 ? '10mm' : '0'}; ${a5 ? 'size: A5;' : ''} }
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body { width:${width}; ${a5 ? '' : 'overflow-x:hidden;'} }
  body { font-family:'Cairo','Segoe UI',Tahoma,sans-serif; font-size:${base}px; color:#000; background:#fff; }
  .c { text-align:center; }
  .hd { text-align:center; padding:4px 0; }
  .hd .name { font-size:${base + 7}px; font-weight:700; }
  .hd .sm { font-size:${base - 3}px; }
  .reprint { text-align:center; font-weight:700; border:2px solid #000; margin:4px 0; }
  hr { border:none; border-top:2px dashed #000; margin:6px 0; }
  .meta { font-size:${base - 2}px; line-height:1.5; }
  table { width:100%; border-collapse:collapse; font-size:${base - 1}px; table-layout:fixed; }
  th { font-weight:700; border-bottom:2px solid #000; padding:3px 0; }
  td { padding:3px 0; vertical-align:top; }
  td.n, th.n { width:42%; overflow-wrap:anywhere; }
  .row { display:flex; justify-content:space-between; }
  .tot { font-size:${base + 3}px; font-weight:700; display:flex; justify-content:space-between; padding:3px 0; }
  .ft { text-align:center; font-size:${base - 3}px; padding-top:6px; }
  .bc { text-align:center; padding-top:6px; }
  .bc svg { max-width:90%; height:auto; }
</style></head><body>
  <div class="hd">
    <div class="name">${esc(pharmacy.name)}</div>
    ${pharmacy.address ? `<div class="sm">${esc(pharmacy.address)}</div>` : ''}
    ${pharmacy.phone ? `<div class="sm">ت: ${esc(pharmacy.phone)}</div>` : ''}
    ${pharmacy.licenseNo ? `<div class="sm">ترخيص: ${esc(pharmacy.licenseNo)}</div>` : ''}
    ${pharmacy.taxNumber ? `<div class="sm">رقم ضريبي: ${esc(pharmacy.taxNumber)}</div>` : ''}
  </div>
  ${opts.reprint ? '<div class="reprint">نسخة مُعاد طباعتها</div>' : ''}
  <hr>
  <div class="meta">
    <div class="row"><span>فاتورة رقم: ${d.serial}</span><span>${d.invoiceType === 'cash' ? 'كاش' : 'آجل'}</span></div>
    <div>${esc(d.dateTime)}</div>
    <div>الكاشير: ${esc(d.cashier)}</div>
    ${d.customerName ? `<div>العميل: ${esc(d.customerName)}</div>` : ''}
  </div>
  <hr>
  <table>
    <thead><tr><th class="n">الصنف</th><th class="c">الكمية</th><th class="c">السعر</th><th class="c">الإجمالي</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <hr>
  <div class="row"><span>عدد الأصناف</span><span>${d.lines.length}</span></div>
  ${d.discount ? `<div class="row"><span>الخصم</span><span>${egp(d.discount)}</span></div>` : ''}
  ${d.extraCharge ? `<div class="row"><span>مبلغ إضافي</span><span>${egp(d.extraCharge)}</span></div>` : ''}
  <div class="tot"><span>الإجمالي</span><span>${egp(d.total)} ج.م</span></div>
  ${
    d.insuranceShare > 0
      ? `<div class="row"><span>حصة ${esc(d.insuranceCompany ?? 'التأمين')}</span><span>${egp(d.insuranceShare)}</span></div>
         <div class="tot"><span>يدفع العميل</span><span>${egp(d.patientPays)} ج.م</span></div>`
      : ''
  }
  ${
    d.invoiceType === 'cash' && d.tendered != null
      ? `<div class="row"><span>المدفوع</span><span>${egp(d.tendered)}</span></div>
         <div class="row"><span>الباقي</span><span>${egp(d.change)}</span></div>`
      : ''
  }
  <hr>
  ${opts.returnWindowDays ? `<div class="ft">سياسة الاسترجاع خلال ${opts.returnWindowDays} يوم</div>` : ''}
  <div class="ft">${esc(pharmacy.receiptFooter || 'شكراً لزيارتكم')}</div>
  <div class="bc">${code128Svg(String(d.serial), { moduleWidth: a5 ? 1.5 : 2, height: 50 })}</div>
</body></html>`;
}

/** P10 companion — plain ASCII summary printed if rasterising keeps failing. */
export function fallbackText(d: ReceiptData): string {
  return [`INV ${d.serial}`, d.dateTime, `ITEMS ${d.lines.length}`, `TOTAL ${egp(d.total)} EGP`].join('\n');
}

export function testReceiptData(): ReceiptData {
  return {
    serial: 0,
    status: 'confirmed',
    invoiceType: 'cash',
    dateTime: new Date().toLocaleString('ar-EG'),
    cashier: 'اختبار',
    customerName: null,
    lines: [
      { name: 'نوبراديكس مرهم — Test Item', unitName: 'علبة', qty: 1, unitPrice: 10000, total: 10000 },
      { name: 'باراسيتامول ٥٠٠ مجم أقراص', unitName: 'شريط', qty: 2, unitPrice: 1250, total: 2500 },
    ],
    subtotal: 12500,
    discount: 0,
    extraCharge: 0,
    total: 12500,
    insuranceShare: 0,
    insuranceCompany: null,
    patientPays: 12500,
    tendered: 20000,
    change: 7500,
  };
}
