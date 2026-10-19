#!/usr/bin/env node

/**
 * Windows package build, safe to run from macOS.
 *
 * better-sqlite3 is a native addon — this machine's node_modules copy is
 * built for macOS/arm64, which is what `npm run dev` needs. Packaging a
 * Windows target needs the win32/x64 build of that same addon swapped in
 * for just the electron-builder run, or `npm run dev` breaks immediately
 * afterward (dlopen: "slice is not valid mach-o file") until someone
 * remembers to rebuild it back.
 *
 * This script does the swap, runs the packaged build, and ALWAYS restores
 * the macOS binary in a finally block — even if the build throws — so a
 * failed or interrupted Windows package build can never leave local dev
 * broken again.
 *
 * Binaries are cached in .native-cache/ (gitignored) after the first run of
 * each target so repeat builds don't need network access or a fresh
 * electron-rebuild pass.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const NATIVE_MODULE = path.join(ROOT, 'node_modules/better-sqlite3/build/Release/better_sqlite3.node');
const CACHE_DIR = path.join(ROOT, '.native-cache');
const DARWIN_CACHE = path.join(CACHE_DIR, 'better_sqlite3-darwin-arm64.node');
const WIN_CACHE = path.join(CACHE_DIR, 'better_sqlite3-win32-x64.node');

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with code ${result.status}`);
  }
}

function ensureDarwinCached() {
  if (existsSync(DARWIN_CACHE)) return;
  mkdirSync(CACHE_DIR, { recursive: true });
  console.log('[package-win] No cached macOS binary yet — rebuilding for host platform first...');
  run('npx', ['electron-rebuild', '-f', '-w', 'better-sqlite3'], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined },
  });
  copyFileSync(NATIVE_MODULE, DARWIN_CACHE);
}

function ensureWinCached() {
  if (existsSync(WIN_CACHE)) return;
  mkdirSync(CACHE_DIR, { recursive: true });
  console.log('[package-win] No cached Windows binary yet — fetching via prebuild-install...');
  run(
    'npx',
    ['prebuild-install', '--platform=win32', '--arch=x64', '--target=33.4.11', '--runtime=electron', '--verbose'],
    { cwd: path.join(ROOT, 'node_modules/better-sqlite3') }
  );
  copyFileSync(NATIVE_MODULE, WIN_CACHE);
}

function restoreDarwin() {
  if (!existsSync(DARWIN_CACHE)) {
    console.warn(
      '[package-win] WARNING: no cached macOS binary to restore — run `npm run postinstall` manually to fix local dev.'
    );
    return;
  }
  copyFileSync(DARWIN_CACHE, NATIVE_MODULE);
  console.log('[package-win] Restored macOS/arm64 better-sqlite3 for local dev.');
}

function hasRosetta() {
  return spawnSync('arch', ['-x86_64', '/usr/bin/true']).status === 0;
}

let failed = false;
try {
  ensureDarwinCached();
  ensureWinCached();

  console.log('[package-win] Swapping in Windows/x64 better-sqlite3 for the package build...');
  copyFileSync(WIN_CACHE, NATIVE_MODULE);

  console.log('[package-win] Building renderer/main/preload...');
  run('npm', ['run', 'build']);

  // Stamping the exe's icon/version runs rcedit through wine, an x86 binary.
  // On Apple Silicon without Rosetta it cannot start ("bad CPU type"), so
  // that one step is skipped: the app is identical, only Explorer shows the
  // stock Electron icon. `softwareupdate --install-rosetta` restores it.
  const args = ['electron-builder', '--win', '--x64'];
  if (process.platform === 'darwin' && process.arch === 'arm64' && !hasRosetta()) {
    console.warn('[package-win] Rosetta not installed — building without the exe icon/version stamp.');
    args.push('-c.win.signAndEditExecutable=false');
  }
  console.log(`[package-win] Running ${args.join(' ')}...`);
  run('npx', args);
} catch (err) {
  failed = true;
  console.error('[package-win] Build failed:', err.message);
} finally {
  restoreDarwin();
}

process.exit(failed ? 1 : 0);
