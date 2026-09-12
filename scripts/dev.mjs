#!/usr/bin/env node

/**
 * Dev launcher.
 *
 * Exists solely to strip ELECTRON_RUN_AS_NODE before handing off to
 * electron-vite. That variable makes any Electron binary run as a plain Node
 * interpreter — no browser process, so `app` is undefined and the first
 * `app.whenReady()` throws. electron-vite spawns Electron with the inherited
 * environment, so it cannot defend against this itself.
 *
 * Diagnosis: `$(node -e "console.log(require('electron'))") --version` prints
 * the bundled Node version instead of the Electron version when it is set.
 */

import { spawn } from 'node:child_process';

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const args = process.argv.slice(2);
const mode = args[0] ?? 'dev';

const child = spawn('npx', ['electron-vite', mode, ...args.slice(1)], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => process.exit(code ?? 0));
