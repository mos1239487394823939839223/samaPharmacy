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
  type DbRequest,
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
};

contextBridge.exposeInMainWorld('api', api);
