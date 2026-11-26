/**
 * Turns an audit row into something a pharmacist can read: an Arabic name
 * for the operation, the record by name (not its internal id), and the
 * payload as labelled lines — money in EGP, yes/no for flags — instead of
 * raw JSON. Anything unknown still shows, with its key, rather than vanish.
 */

import type { AuditRow } from '@pharmacy/shared';
import { fromPiastresGrouped } from '@pharmacy/core';
import { ar } from '../../i18n/ar';

const t = ar.audit;

export interface AuditLine {
  label: string;
  value: string;
}

export interface AuditView {
  /** «إضافة صنف», «تأكيد فاتورة شراء»… */
  title: string;
  /** Section of the app: الأصناف، المبيعات… */
  section: string;
  /** The record by name, e.g. «كونكور 5 مجم», «فاتورة #12». */
  subject: string;
  note: string | null;
  after: AuditLine[];
  before: AuditLine[];
}

/** Payload keys that are internal plumbing, not information. */
const HIDDEN = new Set(['filePath', 'mapping', 'lines', 'units', 'barcodes', 'addresses', 'tags', 'details', 'rejections', 'input']);
/** Keys holding piastres. */
const MONEY = /(price|amount|total|balance|cost|float|cash|paid|limit|expenses|discountAmt|share|maxPerInvoice)$/i;

function value(key: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? t.yes : t.no;
  if (typeof v === 'number' && MONEY.test(key)) return `${fromPiastresGrouped(v)} ${ar.common.currency}`;
  if (typeof v === 'string') {
    const label = (t.values as Record<string, string>)[v];
    return label ?? v;
  }
  if (Array.isArray(v)) return t.countOf.replace('{n}', String(v.length));
  if (typeof v === 'number') return v.toLocaleString('en-US');
  return t.complex;
}

function lines(json: string | null): AuditLine[] {
  if (!json) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [{ label: t.details, value: json }];
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return [{ label: t.details, value: value('', data) }];
  const fields = t.fields as Record<string, string>;
  const out: AuditLine[] = [];
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    // Internal ids (itemId, unitId, warehouseId…) mean nothing to staff; the
    // record is already named in its own column.
    if (/Ids?$/.test(k)) continue;
    if (k === 'id' || HIDDEN.has(k)) {
      // Summarise lists that matter instead of dropping them.
      if (k === 'lines' && Array.isArray(v)) out.push({ label: fields.lines ?? k, value: t.countOf.replace('{n}', String(v.length)) });
      if (k === 'input' && v && typeof v === 'object') out.push(...lines(JSON.stringify(v)));
      continue;
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      // One level of nesting (settings sections): flatten with the section's name.
      for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
        if (v2 && typeof v2 === 'object') continue;
        out.push({ label: `${fields[k] ?? k} — ${fields[k2] ?? k2}`, value: value(k2, v2) });
      }
      continue;
    }
    out.push({ label: fields[k] ?? k, value: value(k, v) });
  }
  return out;
}

export function describeAudit(r: AuditRow): AuditView {
  const actions = t.actions as Record<string, string>;
  const sections = t.sections as Record<string, string>;
  const notes = t.notes as Record<string, string>;
  return {
    title: actions[r.action] ?? r.action,
    section: sections[r.entity] ?? r.entity,
    subject: r.subject ?? (r.entityId != null ? `#${r.entityId}` : '—'),
    note: r.note ? notes[r.note] ?? r.note : null,
    after: lines(r.afterJson),
    before: lines(r.beforeJson),
  };
}
