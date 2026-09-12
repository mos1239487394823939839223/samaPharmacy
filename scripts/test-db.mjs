#!/usr/bin/env node

/**
 * Run the packages/db tests under Electron's bundled Node.
 *
 * better-sqlite3 is rebuilt against Electron's ABI by the postinstall hook, so
 * plain Node cannot load it — `NODE_MODULE_VERSION 130 vs 127`. Rebuilding for
 * the system Node would fix the tests and break the application, which is the
 * wrong trade.
 *
 * ELECTRON_RUN_AS_NODE is the one place that variable is wanted: it makes the
 * Electron binary behave as a Node interpreter with the matching ABI. Every
 * other entry point strips it (see scripts/dev.mjs).
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const electronBinary = require('electron');

const child = spawn(
  electronBinary,
  [require.resolve('vitest/vitest.mjs'), 'run', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  }
);

child.on('exit', (code) => process.exit(code ?? 0));
