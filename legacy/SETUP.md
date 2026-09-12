# Setup & Running Sama Pharmacy

## Install and run

```bash
cd /Users/mostafaanwer/Desktop/Projects/samaPharmacy
npm install
npm run dev
```

The window opens on the Sales screen. Sidebar navigation between screens works.

## If the window is blank or Electron will not start

### `ELECTRON_RUN_AS_NODE` in your shell

This variable is set in your environment. It tells any Electron binary to run
as a plain Node interpreter: no browser process, no `app`, and
`require('electron')` returns the binary's *path* instead of the API object.
The symptom is:

```
TypeError: Cannot read properties of undefined (reading 'on')
```

Verify:

```bash
node -e "console.log(require('electron'))"          # prints a path string
$(node -e "console.log(require('electron'))") --version
#   with the var set   -> v18.17.1  (the bundled Node version)
#   with it unset      -> v27.3.11  (correct)
```

`scripts/dev.js` strips the variable from the child environment, so `npm run dev`
works regardless. If you launch Electron by hand, clear it yourself:

```bash
env -u ELECTRON_RUN_AS_NODE npx electron .
```

Worth finding where it is set (`~/.zshrc`, `~/.zprofile`) since it will affect
every Electron project on this machine.

## Build layout

The two processes are built separately because they have different constraints:

| Process | Tool | Output | Why |
|---|---|---|---|
| main | `tsc` | CommonJS | runs in Node, needs `require` |
| renderer | `esbuild` | browser IIFE | runs in Chromium with `nodeIntegration: false`, so it has **no** `require` |

`tsconfig.json` excludes `src/renderer` for exactly this reason. Compiling the
renderer with `tsc` emits CommonJS, which throws `exports is not defined` in the
browser and leaves the window blank. esbuild also inlines the `index.css` import,
which `tsc` cannot do.

Do not hand-edit `dist/` — it is regenerated on every build.

## Stray processes

A failed launch can orphan Electron processes, which makes later runs
misleading. Clear them before re-testing:

```bash
pkill -f "samaPharmacy/node_modules/electron"
```

## Status

| Area | State |
|---|---|
| Dependencies | installed |
| Main process build (`tsc`) | passing |
| Renderer bundle (esbuild) | passing |
| Electron launch | working |
| UI renders (RTL Arabic, sidebar, Sales screen) | verified |
| Screen navigation | verified |
| Database wiring (schema exists, not called from UI) | not implemented |
| Scanner against real hardware | not tested |
| Printer against real hardware | not tested — `src/main/printer-service.ts` is a stub that logs instead of printing |

The full ESC/POS implementation lives in `src/hardware/escpos-printer.ts` but is
not yet wired to the IPC layer; `src/main/ipc.ts` currently calls the stub and
its `receiptHtml`/`fallbackText` are placeholders.
