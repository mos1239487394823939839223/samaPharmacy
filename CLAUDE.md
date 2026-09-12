# Pharmacy Management System

Windows desktop app for a single Egyptian pharmacy. Electron + React + Node + SQLite.
Arabic-first, RTL, fully offline.

Design documents live in `docs/`. Read `docs/architecture-and-ui-blueprint.md` before
any structural decision. `docs/schema.sql` is the source of truth for the data model.

## Non-negotiable rules

These are not style preferences. Violating any of them causes silent data corruption
or a counter that staff refuse to use.

1. **Money is INTEGER piastres.** Never `REAL`, never float arithmetic. All money
   passes through `packages/core/money.ts`. 100 piastres = 1 EGP.
2. **Quantities are INTEGER base units** (individual tablets/ml). Packs and strips
   are display conversions through `item_units.factor`.
3. **Dates are ISO-8601 text.** `YYYY-MM-DD` for expiry, `YYYY-MM-DDTHH:mm:ss` for
   timestamps.
4. **Keyboard input reads `event.code`, never `event.key`.** With the Windows input
   language set to Arabic, `.key` returns Arabic letters for scanned barcodes.
5. **The renderer never touches SQLite, sockets, or the filesystem.** All access goes
   through the typed preload bridge. `contextIsolation: true`, `nodeIntegration: false`.
6. **SQLite runs in a `utilityProcess`.** `better-sqlite3` is synchronous and will
   freeze the window if run on the main process.
7. **`PRAGMA foreign_keys = ON` on every connection.** It is OFF by default in SQLite.
8. **Every stock change writes a `stock_moves` row** in the same transaction as the
   change to `batches.qty_on_hand`. Stock must be rebuildable from the ledger.
9. **Nothing is deleted.** Corrections are reversing entries. Posted invoices are never
   edited.
10. **Printing happens after the database transaction commits.** Never await a print
    inside a transaction.
11. **Arabic text is normalized on write** into `*_norm` columns before it is searched.
12. **No POS interaction may require the mouse.**

## Stack

- `electron-vite` for build, `electron-builder` + NSIS for packaging
- `better-sqlite3` with `@electron/rebuild` wired into `postinstall`
- `drizzle-orm` or `kysely` for typed SQL — no heavyweight ORM
- React 18, TanStack Query (server state), Zustand (UI state)
- `react-hook-form` + `zod` for forms
- AG Grid Community for invoice grids (keyboard nav + RTL)
- Tailwind with `dir="rtl"` and logical CSS properties
- Cairo or Tajawal font, bundled not system-linked

## Layout

```
packages/core      pure domain logic, zero I/O, unit tested
packages/db        schema, migrations, repositories
packages/api       service layer — the IPC/HTTP seam
packages/shared    types, IPC contracts, zod schemas
apps/desktop       Electron main, utilityProcess, preload
apps/renderer      React
```

Every UI call goes through `packages/api`. Today it runs over IPC; when a second till
is added the same layer mounts behind Fastify and only the transport changes.

## Testing

`packages/core` gets real unit tests, specifically:
- landed cost with bonus quantities and header-level expenses
- FEFO batch allocation including partial batch consumption
- money arithmetic and rounding
- Arabic normalization

UI and repositories do not need exhaustive tests. Those four do.

## Language

UI strings are Arabic, sourced from an i18n file — never hardcoded in components.
Code, comments, and commit messages are English.

## Environment notes

`ELECTRON_RUN_AS_NODE=1` is set in this machine's shell. It makes the Electron binary
run as a plain Node interpreter — no browser process, no `app`, and
`require('electron')` returns the binary path string instead of the API object. Any
script that launches Electron must strip it from the child environment. Verify with
`$(node -e "console.log(require('electron'))") --version`: correct output is the
Electron version, not the bundled Node version.

The renderer must be bundled for the browser (esbuild/vite IIFE or ESM). `tsc`'s
CommonJS output throws `exports is not defined` in a renderer with
`nodeIntegration: false`, leaving a blank window.
