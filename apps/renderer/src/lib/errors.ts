/**
 * Turn anything caught from window.api into an Arabic sentence.
 *
 * The backend throws coded errors (packages/core DomainError); the code
 * survives every process hop inside the message (packages/shared errors.ts)
 * and is looked up in ar.errors here. Money parameters arrive in piastres
 * and are shown in EGP. An uncoded failure never shows its English text —
 * it is logged to the console and the pharmacist gets a plain Arabic notice.
 */

import { decodeAppError } from '@pharmacy/shared';
import { fromPiastres } from '@pharmacy/core';
import { ar } from '../i18n/ar';

/** Params that hold piastres and must be shown as EGP. */
const MONEY_PARAMS = new Set(['price', 'list', 'tendered', 'total', 'balance', 'limit', 'cap', 'variance', 'claimed', 'available']);

const messages = ar.errors as Record<string, string>;

export function errorText(err: unknown): string {
  const info = decodeAppError(err);
  if (!info) {
    console.error(err);
    return messages.generic!;
  }
  const template = messages[info.code];
  if (!template) {
    console.error(`[${info.code}]`, info.message);
    return messages.generic!;
  }
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const value = info.params[key];
    if (value === undefined || value === null) return '';
    return MONEY_PARAMS.has(key) && typeof value === 'number' ? `${fromPiastres(value)} ${ar.common.currency}` : String(value);
  });
}

/** The error's code, for screens that react to a specific failure. */
export function errorCode(err: unknown): string | null {
  return decodeAppError(err)?.code ?? null;
}
