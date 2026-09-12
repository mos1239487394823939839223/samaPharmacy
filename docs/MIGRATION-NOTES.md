# Migration notes: current code → monorepo layout

Written at the start of the M0 milestone. The existing flat `src/` tree predates the
prompt pack and conflicts with `CLAUDE.md` in several places. This records what maps
where, and what must be rebuilt rather than moved, so the decision is not re-litigated
mid-M0.

## Current tree

```
src/
├── main/         index.ts, app.ts, ipc.ts, database.ts, printer-service.ts
├── renderer/     App.tsx, store.ts, index.tsx, index.css, index.html,
│                 screens/{Sales,Settings}.tsx, components/Layout.tsx,
│                 hooks/useScannerSetup.ts
├── hardware/     scanner.ts, escpos-printer.ts
├── types/        index.ts
└── preload.ts
```

## Mapping

| Current | Destination | Action |
|---|---|---|
| `src/types/index.ts` | `packages/shared` | **Rewrite.** Types were invented, not derived from `schema.sql`. Once `schema.sql` lands it is the source of truth and these get regenerated/rewritten against it. |
| `src/hardware/scanner.ts` | `apps/renderer` | Move at M6. Canonical copy is `docs/reference/scanner.ts` — adapt, never rewrite, preserve guards G1–G5. |
| `src/hardware/escpos-printer.ts` | `apps/desktop` | Move at M6. Canonical copy is `docs/reference/escpos-printer.ts` — preserve guards P1–P10. |
| `src/main/index.ts`, `app.ts` | `apps/desktop` | Rewrite for `electron-vite` + `utilityProcess`. |
| `src/preload.ts` | `apps/desktop` | Rewrite as the single typed `api` object (M0 item 5). Current version exposes only printer methods. |
| `src/renderer/*` | `apps/renderer` | Shell (Layout, store, RTL setup) carries over as reference. Screens rebuilt at M2/M5 against the blueprint. |
| `src/main/database.ts` | `packages/db` | **Rewrite.** Violates rule 6 — runs `better-sqlite3` on the main process. Schema was invented and is superseded by `schema.sql`. |
| `src/main/printer-service.ts` | — | **Delete.** Stub written during debugging; logs instead of printing. The real implementation is `docs/reference/escpos-printer.ts`. |
| `src/main/ipc.ts` | `packages/api` | **Rewrite.** Calls the stub; `receiptHtml`/`fallbackText` are placeholders. |

## Known rule violations in current code

Fixed by the M0 rewrite, listed so they are not carried forward:

- **Rule 6** — `src/main/database.ts` runs SQLite synchronously on the main process.
- **Rule 1** — no `packages/core/money.ts`; `types/index.ts` only *says* piastres in
  comments, nothing enforces it.
- **Rule 11** — no Arabic normalization and no `*_norm` columns.
- **Rule 8** — no `stock_moves` ledger at all.
- **Rule 12** — `screens/Sales.tsx` has no keyboard path; it is mouse-only.

Rule 4 is **not** violated: `hardware/scanner.ts` correctly reads `event.code`.

## Carried-forward fixes

Two real bugs were diagnosed and fixed before this milestone. Both are recorded in
`CLAUDE.md` under "Environment notes" and must survive the rewrite:

1. `ELECTRON_RUN_AS_NODE=1` in the shell prevents Electron from starting at all.
   Launch scripts must strip it.
2. The renderer must be browser-bundled. `tsc` CommonJS output throws
   `exports is not defined` and yields a blank window.

## Status of prior documentation

`README.md`, `SUMMARY.txt`, `PROJECT_STRUCTURE.txt`, `IMPLEMENTATION_CHECKLIST.md`,
`ARCHITECTURE.md` and `QUICKSTART.md` were written before the prompt pack and describe
the flat layout, an invented schema, and a feature set that does not exist. They
overstate completeness. Treat `CLAUDE.md` and `docs/` as authoritative; delete or
rewrite the rest during M0. `SETUP.md` is accurate as of the last session.
