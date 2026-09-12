import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const shared = resolve(__dirname, 'packages/shared/src');
const core = resolve(__dirname, 'packages/core/src');
const db = resolve(__dirname, 'packages/db/src');
const api = resolve(__dirname, 'packages/api/src');

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: { '@pharmacy/shared': shared, '@pharmacy/core': core, '@pharmacy/api': api },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'apps/desktop/src/main/index.ts'),
          // The db host is a separate entry: utilityProcess.fork() needs a real
          // file on disk, not a module imported into the main bundle.
          'db-process/index': resolve(__dirname, 'apps/desktop/src/db-process/index.ts'),
        },
        output: { entryFileNames: '[name].js' },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { '@pharmacy/shared': shared } },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'apps/desktop/src/preload/index.ts') },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'apps/renderer'),
    plugins: [react()],
    resolve: {
      alias: { '@pharmacy/shared': shared, '@pharmacy/core': core },
    },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'apps/renderer/index.html') },
      },
    },
  },
});
