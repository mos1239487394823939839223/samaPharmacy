/**
 * Carrying a DomainError's code across process boundaries.
 *
 * db-process → main (utilityProcess message) → renderer (ipcRenderer.invoke
 * and then contextBridge). Electron preserves only the `message` of an Error
 * thrown across contextBridge — custom properties are dropped — so the code
 * and its parameters ride inside the message as a tagged JSON payload.
 * decodeAppError() recovers them in the renderer, which turns the code into
 * an Arabic sentence (apps/renderer/src/lib/errors.ts).
 */

export type AppErrorParams = Record<string, string | number | null>;

export interface AppErrorInfo {
  code: string;
  params: AppErrorParams;
  /** English diagnostic text — logs and tests only. */
  message: string;
}

const TAG = 'APPERR:';

export function encodeAppError(info: AppErrorInfo): string {
  return TAG + JSON.stringify(info);
}

/** Recover the code from anything caught in the renderer; null when it is not an encoded app error. */
export function decodeAppError(err: unknown): AppErrorInfo | null {
  const text = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  const at = text.indexOf(TAG);
  if (at < 0) return null;
  try {
    const parsed = JSON.parse(text.slice(at + TAG.length)) as AppErrorInfo;
    return typeof parsed.code === 'string' ? { code: parsed.code, params: parsed.params ?? {}, message: parsed.message ?? '' } : null;
  } catch {
    return null;
  }
}
