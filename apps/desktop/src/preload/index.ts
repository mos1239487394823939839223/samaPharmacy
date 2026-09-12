/**
 * Preload — the only bridge between renderer and main.
 *
 * Exposes one typed `api` object. `ipcRenderer` itself is never exposed: handing
 * the renderer a general-purpose channel would let any script in it reach the
 * whole main-process surface, which is the thing contextIsolation exists to stop.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type PingResult, type RendererApi } from '@pharmacy/shared';

const api: RendererApi = {
  ping: () => ipcRenderer.invoke(IPC.dbRequest, { kind: 'ping' }) as Promise<PingResult>,
};

contextBridge.exposeInMainWorld('api', api);
