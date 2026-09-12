/**
 * IPC contract shared by renderer, main, and the database utilityProcess.
 *
 * This file is the single definition of what can cross a process boundary.
 * Renderer imports the types only; it never imports anything that touches I/O.
 */

import type {
  ItemInput,
  ItemListRow,
  ItemDetail,
  ImportPreview,
  ImportResult,
  ImportProgressEvent,
} from './items';

/** Requests the main process forwards to the database utilityProcess. */
export type DbRequest =
  | { kind: 'ping' }
  | { kind: 'migrate' }
  | { kind: 'items.list'; limit?: number; offset?: number }
  | { kind: 'items.search'; query: string; limit?: number }
  | { kind: 'items.get'; id: number }
  | { kind: 'items.create'; input: ItemInput }
  | { kind: 'items.update'; id: number; input: ItemInput }
  | { kind: 'items.deactivate'; id: number }
  | { kind: 'items.count' }
  | { kind: 'items.findByBarcode'; barcode: string }
  | { kind: 'import.pickFile' }
  | { kind: 'import.preview'; filePath: string; mapping?: Record<string, number> }
  | { kind: 'import.apply'; filePath: string; mapping: Record<string, number> }
  | { kind: 'import.saveRejects'; csv: string };

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
  items: {
    list(opts?: { limit?: number; offset?: number }): Promise<ItemListRow[]>;
    search(query: string, limit?: number): Promise<ItemListRow[]>;
    get(id: number): Promise<ItemDetail | null>;
    create(input: ItemInput): Promise<number>;
    update(id: number, input: ItemInput): Promise<void>;
    deactivate(id: number): Promise<void>;
    count(): Promise<number>;
    findByBarcode(barcode: string): Promise<ItemListRow | null>;
  };
  import: {
    /** Opens the OS file dialog. Returns null if the user cancels. */
    pickFile(): Promise<string | null>;
    preview(filePath: string, mapping?: Record<string, number>): Promise<ImportPreview>;
    apply(filePath: string, mapping: Record<string, number>): Promise<ImportResult>;
    /** Writes the rejected-rows CSV somewhere the user chooses. */
    saveRejects(csv: string): Promise<string | null>;
    onProgress(listener: (p: ImportProgressEvent) => void): () => void;
  };
}

/** Main → renderer push channel for long-running work. */
export const IPC_EVENTS = {
  importProgress: 'import:progress',
} as const;
