/**
 * IPC contract shared by renderer, main, and the database utilityProcess.
 *
 * This file is the single definition of what can cross a process boundary.
 * Renderer imports the types only; it never imports anything that touches I/O.
 */

/** Requests the main process forwards to the database utilityProcess. */
export type DbRequest =
  | { kind: 'ping' }
  | { kind: 'migrate' };

export interface PingResult {
  sqliteVersion: string;
  /** Applied migration versions, ascending. */
  migrations: number[];
  /** Absolute path to the open database file. */
  databasePath: string;
  foreignKeys: boolean;
  journalMode: string;
}

export interface MigrateResult {
  applied: number[];
  alreadyCurrent: boolean;
}

export type DbResultMap = {
  ping: PingResult;
  migrate: MigrateResult;
};

/** Envelope for a request sent to the db process. */
export interface DbRequestEnvelope {
  id: number;
  request: DbRequest;
}

/** Envelope for a reply from the db process. Never throws across the boundary. */
export type DbResponseEnvelope =
  | { id: number; ok: true; data: unknown }
  | { id: number; ok: false; error: string };

/** IPC channel names. Kept here so main and preload cannot drift apart. */
export const IPC = {
  dbRequest: 'db:request',
} as const;

/**
 * The surface exposed on `window.api` by the preload script.
 * Renderer code is written against this interface and nothing else.
 */
export interface RendererApi {
  ping(): Promise<PingResult>;
}
