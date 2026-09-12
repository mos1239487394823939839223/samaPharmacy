/**
 * Preload — the only bridge between renderer and main.
 *
 * Exposes one typed `api` object. `ipcRenderer` itself is never exposed: handing
 * the renderer a general-purpose channel would let any script in it reach the
 * whole main-process surface, which is the thing contextIsolation exists to stop.
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC,
  IPC_EVENTS,
  type DbRequest,
  type ImportPreview,
  type ImportProgressEvent,
  type ImportResult,
  type ItemDetail,
  type ItemInput,
  type ItemListRow,
  type PingResult,
  type RendererApi,
} from '@pharmacy/shared';

function send<T>(request: DbRequest): Promise<T> {
  return ipcRenderer.invoke(IPC.dbRequest, request) as Promise<T>;
}

const api: RendererApi = {
  ping: () => send<PingResult>({ kind: 'ping' }),

  items: {
    list: (opts) =>
      send<ItemListRow[]>({ kind: 'items.list', limit: opts?.limit, offset: opts?.offset }),
    search: (query, limit) => send<ItemListRow[]>({ kind: 'items.search', query, limit }),
    get: (id) => send<ItemDetail | null>({ kind: 'items.get', id }),
    create: (input: ItemInput) => send<number>({ kind: 'items.create', input }),
    update: (id, input: ItemInput) => send<void>({ kind: 'items.update', id, input }),
    deactivate: (id) => send<void>({ kind: 'items.deactivate', id }),
    count: () => send<number>({ kind: 'items.count' }),
    findByBarcode: (barcode) =>
      send<ItemListRow | null>({ kind: 'items.findByBarcode', barcode }),
  },

  import: {
    pickFile: () => send<string | null>({ kind: 'import.pickFile' }),
    preview: (filePath, mapping) =>
      send<ImportPreview>({ kind: 'import.preview', filePath, mapping }),
    apply: (filePath, mapping) =>
      send<ImportResult>({ kind: 'import.apply', filePath, mapping }),
    saveRejects: (csv) => send<string | null>({ kind: 'import.saveRejects', csv }),
    onProgress: (listener: (p: ImportProgressEvent) => void) => {
      // Wrap rather than passing the listener to ipcRenderer directly, so the
      // renderer never receives the IpcRendererEvent and with it a handle back
      // into the main process.
      const handler = (_e: unknown, data: ImportProgressEvent) => listener(data);
      ipcRenderer.on(IPC_EVENTS.importProgress, handler);
      return () => ipcRenderer.removeListener(IPC_EVENTS.importProgress, handler);
    },
  },
};

contextBridge.exposeInMainWorld('api', api);
