#!/usr/bin/env node

/**
 * Development build + launch.
 *
 * Two separate builds, because the two processes have different constraints:
 *   main     -> tsc, CommonJS, runs in Node
 *   renderer -> esbuild, browser IIFE, runs in Chromium with no `require`
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Compiling main process...');

const tsc = spawn('npx', ['tsc'], { cwd: rootDir, stdio: 'inherit' });

tsc.on('close', (code) => {
  if (code !== 0) {
    console.error('TypeScript compilation failed');
    process.exit(1);
  }

  console.log('✓ Main process compiled');

  const srcRendererDir = path.join(srcDir, 'renderer');
  const distRendererDir = path.join(distDir, 'renderer');

  if (!fs.existsSync(distRendererDir)) {
    fs.mkdirSync(distRendererDir, { recursive: true });
  }

  // The renderer runs with nodeIntegration disabled, so it has no `require`.
  // tsc's CommonJS output throws "exports is not defined" there. esbuild emits
  // a browser-ready IIFE and inlines the CSS import.
  console.log('Bundling renderer...');
  try {
    require('esbuild').buildSync({
      entryPoints: [path.join(srcRendererDir, 'index.tsx')],
      bundle: true,
      outfile: path.join(distRendererDir, 'index.js'),
      platform: 'browser',
      format: 'iife',
      target: 'chrome118',
      jsx: 'automatic',
      sourcemap: true,
      loader: { '.css': 'css' },
    });
  } catch (err) {
    console.error('Renderer bundling failed:', err.message);
    process.exit(1);
  }

  const srcHtml = path.join(srcRendererDir, 'index.html');
  if (fs.existsSync(srcHtml)) {
    fs.copyFileSync(srcHtml, path.join(distRendererDir, 'index.html'));
  }

  console.log('✓ Renderer bundled');
  console.log('Starting Electron...\n');

  // require('electron') from Node gives the binary path, not the API object.
  const electronBinary = require('electron');

  // ELECTRON_RUN_AS_NODE makes the binary run as plain Node: no browser
  // process, no `app`. If it is set in the user's shell, Electron cannot
  // start, so it is stripped here.
  const env = { ...process.env, NODE_ENV: 'development' };
  delete env.ELECTRON_RUN_AS_NODE;

  const electron = spawn(electronBinary, ['.'], {
    cwd: rootDir,
    stdio: 'inherit',
    env,
  });

  electron.on('close', (code) => {
    process.exit(code || 0);
  });
});
