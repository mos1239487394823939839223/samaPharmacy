/**
 * Domain errors.
 *
 * Every business-rule violation is thrown as a DomainError carrying a stable
 * `code` plus the values needed to explain it. The code survives the trip
 * across the db-process → main → renderer boundary (see packages/shared
 * encodeError/decodeError) and the renderer turns it into an Arabic sentence
 * from its i18n file. The English `message` is for logs and tests only — it
 * is never what a pharmacist reads.
 */

export type ErrorParams = Record<string, string | number | null>;

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly params: ErrorParams = {}
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

/** Throw a DomainError unless `condition` holds. */
export function ensure(
  condition: unknown,
  code: string,
  message: string,
  params: ErrorParams = {}
): asserts condition {
  if (!condition) throw new DomainError(code, message, params);
}
