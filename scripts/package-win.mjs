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
import { existsSync, copyFileSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs';
import os from 'node:os';
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

/**
 * The NSIS bundle electron-builder downloads ships an x86-only mac/makensis,
 * which cannot start on Apple Silicon without Rosetta ("Bad CPU type"), so
 * the Setup .exe could not be built. Instead: Homebrew's native makensis
 * (`brew install makensis`) with its own matching stubs, plus the extra
 * plugins/includes electron-builder's installer script needs from its
 * bundle. Returned dir goes to ELECTRON_BUILDER_NSIS_DIR.
 */
function nativeNsisDir() {
  const which = spawnSync('brew', ['--prefix', 'makensis'], { encoding: 'utf8' });
  const prefix = which.status === 0 ? which.stdout.trim() : '';
  const share = path.join(prefix, 'share/nsis');
  if (!prefix || !existsSync(path.join(prefix, 'bin/makensis'))) {
    throw new Error('Rosetta is not installed and no native makensis found — run `brew install makensis`.');
  }
  const bundleRoot = path.join(os.homedir(), 'Library/Caches/electron-builder/nsis');
  const bundle = existsSync(bundleRoot)
    ? readdirSync(bundleRoot).filter((d) => d.startsWith('nsis-3')).map((d) => path.join(bundleRoot, d)).find((d) => existsSync(path.join(d, 'Plugins')))
    : undefined;
  const dir = path.join(CACHE_DIR, 'nsis-native');
  rmSync(dir, { recursive: true, force: true });
  cpSync(share, dir, { recursive: true });
  if (bundle) {
    // Extra plugins (UAC, nsProcess, StdUtils…) and includes; never overwrite NSIS's own.
    for (const sub of ['Plugins', 'Include', 'elevate.exe']) {
      const from = path.join(bundle, sub);
      if (existsSync(from)) cpSync(from, path.join(dir, sub), { recursive: true, force: false, errorOnExist: false });
    }
  }
  mkdirSync(path.join(dir, 'mac'), { recursive: true });
  copyFileSync(path.join(prefix, 'bin/makensis'), path.join(dir, 'mac/makensis'));
  return dir;
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
  // Extra arguments pick the targets, e.g. `npm run package:win -- zip`
  // (the zip needs no makensis, which is x86-only and needs Rosetta).
  const targets = process.argv.slice(2);
  const args = ['electron-builder', '--win', ...targets, '--x64'];
  const env = { ...process.env };
  if (process.platform === 'darwin' && process.arch === 'arm64' && !hasRosetta()) {
    console.warn('[package-win] Rosetta not installed — building without the exe icon/version stamp.');
    args.push('-c.win.signAndEditExecutable=false');
    if (targets.length === 0 || targets.includes('nsis')) {
      env.ELECTRON_BUILDER_NSIS_DIR = nativeNsisDir();
      console.log('[package-win] Using native makensis for the Setup installer.');
    }
  }
  console.log(`[package-win] Running ${args.join(' ')}...`);
  run('npx', args, { env });
} catch (err) {
  failed = true;
  console.error('[package-win] Build failed:', err.message);
} finally {
  restoreDarwin();
}

process.exit(failed ? 1 : 0);
