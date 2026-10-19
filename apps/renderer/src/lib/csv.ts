/**
 * Export a table to CSV for Excel (spec M9: "every report: … export to
 * Excel"). The main process adds a UTF-8 BOM so Excel on Windows reads the
 * Arabic correctly; this only builds the text.
 */

import { ar } from '../i18n/ar';
import { errorText } from './errors';

function cell(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

/** Ask where to save and write it. Returns a user-facing message (saved path, or the error). */
export async function exportCsv(defaultName: string, headers: string[], rows: unknown[][]): Promise<string | null> {
  try {
    const path = await window.api!.files.saveCsv(defaultName, toCsv(headers, rows));
    return path ? ar.exportCsv.saved.replace('{path}', path) : null;
  } catch (err) {
    return errorText(err);
  }
}
