# Resolved decisions

Conflicts found between the design documents, and how they were settled. Recorded so
they are not re-litigated mid-build. Each entry names the documents that disagreed.

---

## D1 — Sales grid column is `قيمة ب.خ`, not `قيمة ن.خ`

**Conflict.** `architecture-and-ui-blueprint.md` §1.6 listed the column as
`قيمة ن.خ`, but the "Confirmed" note three lines below it, and
`schema.sql sales_invoice_lines`, both say `ب.خ`.

**Resolved.** `ب.خ` — *بعد الخصم*, after discount. The `ن` was a transcription
error. Maps to `value_after_discount`. Consistent with the ق/ب before-after pairing
that also explains `ق.ض`/`ب.ض` on the purchase grid.

**Applied.** Blueprint §1.6 corrected in place with a visible correction note.

---

## D2 — Hardware follows the hardware doc, not blueprint §2.8

**Conflict.** Blueprint §2.8 specified timing-only scan detection and
`node-thermal-printer`. `CLAUDE.md` rule 4 and
`docs/hardware-scanner-and-printer.md` specify `event.code` reads with an `F9`
prefix, and Arabic raster printing.

**Resolved.** The hardware doc and `CLAUDE.md` win. Blueprint §2.8 is the earlier,
less-developed take.

Two reasons, both load-bearing:

- Timing-only detection breaks under a Windows Arabic input layout. `.key` returns
  Arabic letters for a scanned barcode (`PH4501A` → `صح4501ش`), the lookup fails, and
  it presents as a phantom database bug. Timing is the *fallback*; the programmed
  `F9` prefix is primary.
- `node-thermal-printer` sends text. Thermal printers have no contextual letter
  shaping and no RTL, so Arabic prints as disconnected, reversed letterforms even on
  printers advertising CP864/CP1256. Receipts must be rendered in a hidden
  `BrowserWindow` and sent as a 1-bit raster via `GS v 0`.

Guards G1–G5 and P1–P10 in `docs/reference/` are preserved, not rewritten.

**Applied.** Blueprint §2.8 marked SUPERSEDED, original text struck through and
retained for context. The cash-drawer bullet remains accurate.

---

## D3 — SQLite runs in a `utilityProcess`

**Conflict.** Blueprint §2.1's diagram places `better-sqlite3` inside Electron main;
§2.2 then says to move it to a `utilityProcess`. `CLAUDE.md` rule 6 requires the
`utilityProcess`.

**Resolved.** `utilityProcess`, from M0. The §2.1 diagram illustrates the *trust
boundary* (renderer never touches the DB), not the process layout. §2.2's own warning
applies: "Do this at the start; retrofitting it later means rewriting every call site."

**Applied.** Blueprint §2.1 diagram updated to show the nested `utilityProcess`.

---

## D4 — ETA e-invoicing columns added to `sales_invoices`

**Conflict.** `pharmacy-system-spec.md` §7 asks for nullable `eta_uuid` and
`eta_status` on the sale entity "so integration can be added without a migration."
`schema.sql` has neither.

**Resolved.** Add both as nullable `TEXT` in migration `0001`. This is a deliberate,
justified deviation from `schema.sql`.

The spec's entire rationale was avoiding a later migration. Omitting them defeats
that: adding the columns after go-live means altering a populated `sales_invoices`
table. Two nullable columns cost nothing now. They stay unused until ETA is confirmed
mandatory.

**Deviation log.** `schema.sql` remains the source of truth for everything else. Any
further change must be justified against it in this file before being written.

---

## D5 — `pharmacy-system-spec.md` module numbering ≠ prompt-pack milestones

Not a conflict, but a trap. The spec's `M1`–`M11` are **feature areas** (M1 Master
Data, M4 Sales/POS, M9 Reporting, M10 Users/Roles/Audit). The prompt pack's `M0`–`M9`
are **build milestones**. They do not correspond.

Prompt-pack M9 cites "spec section M9" and "M10" — those are the spec's *Reporting*
and *Users, Roles and Audit* sections. Both exist. Read carefully when cross-referencing.

---

## D6 — Reference printer needs four changes for the actual device (XP-233B)

`docs/hardware-device-profile.md` specifies the real hardware. Checked against
`docs/reference/escpos-printer.ts`. **The reference does not yet support this
printer.** M6 must close these before the printer is wired up.

**Already compatible — no change needed:**

- `paperWidth: 58` maps to exactly **384 dots** (`PAPER_DOTS`, line 55), which is
  the XP-233B's printable width. The profile's `widthDotsOverride: 384` is already
  the correct value via the 58mm preset; no override mechanism is required.
- `transport: 'share'` exists and writes to `\\localhost\<name>` (`sendShare`).
- `drawerPin: 2` is supported directly.
- P5 already returns `paperOut: null` on non-network transports and lets the queue
  proceed — exactly the "unknown, don't block" behavior the profile describes.

**Gaps that must be closed at M6:**

| # | Gap | Consequence if missed |
|---|---|---|
| 1 | `DEVICE_PROFILES` does not exist | The profile's config snippet does not compile |
| 2 | **`hasCutter` does not exist; `CUT_PARTIAL` is unconditional** (lines 533, 553) | **The XP-233B has no cutter.** A cut command on every sale leaves the last lines jammed in the mechanism. Highest-severity item. |
| 3 | `receiptHtml()` is a fixed four-column table | Unreadable at 384 dots. Needs a narrow layout below ~450 dots: name on its own line, `qty × price` and total beneath. |
| 4 | No ESC/POS-vs-TSPL mode detection | If the printer is left in TSPL mode, raster receipts print as garbage with no diagnostic. Surface in Settings → Hardware. |

## D7 — Scanner config is unresolved until the device is tested

`docs/hardware-device-profile.md` gives a **test procedure, not a specification** —
no manual was found for the UP-770pro.

Consequences for M6:

- Ship with `prefixCode: null` (timing mode). Switch to `'F9'` only if a
  configuration sheet is obtained and the prefix is actually programmed.
- `terminator` cannot be fixed in advance; profile test 2 decides between `'Enter'`
  and `'None'` (the latter relying on guard G3's idle flush).
- Profile test 3 (scan under Arabic Windows layout) is the one that confirms whether
  guard G1 does real work on this hardware. Run it before trusting the timing path.
- Median interval must be read from `scanner.diagnostics()`. Under 20ms is
  comfortable; approaching 35ms means the timing heuristic is unsafe and a prefix
  becomes mandatory.

**Interaction with D4.** This scanner is 1D-only and cannot read QR or DataMatrix. If
ETA e-invoicing becomes applicable, the `eta_uuid`/`eta_status` columns added in D4
will be populated by a device that cannot read the codes involved. Not a blocker —
they are separate concerns — but the two decisions touch, and a 2D imager is the
right choice for the next scanner purchased.

---

## D8 — Three customer discount rates: cash / credit / invoice override

**Was open.** Both `schema.sql` and blueprint §5.4 flagged the semantics as
unconfirmed.

**Resolved.**

| Column | Applies |
|---|---|
| `discount_cash_pct` | cash sales |
| `discount_credit_pct` | credit (آجل) sales |
| `discount_invoice_pct` | whole-invoice override, takes precedence over the other two |

Unblocks M8. Still worth confirming against the live PharmaSyst customer form
before go-live, since this was inferred rather than observed.

## D9 — `packages/db` tests run under Electron's Node

`better-sqlite3` is rebuilt against Electron's ABI by the `postinstall` hook, so
plain Node cannot load it: `NODE_MODULE_VERSION 130` vs `127`. Vitest runs under
system Node and therefore cannot open a database.

**Resolved.** `scripts/test-db.mjs` runs vitest under the Electron binary with
`ELECTRON_RUN_AS_NODE=1`. Rebuilding for system Node would fix the tests and break
the application — the wrong trade.

- `npm run test:core` — pure logic, plain Node, fast
- `npm run test:db` — repositories, Electron's Node
- `npm test` — both

This is the **only** place `ELECTRON_RUN_AS_NODE` is wanted. Every other entry point
strips it (see `scripts/dev.mjs` and CLAUDE.md § Environment notes).

## D10 — Scanner brought forward from M6 to the item form

The scanner integration was scheduled for M6. The item-form routing row
(hardware doc §1.4, "fill the barcode field in the multi-barcode table") was
brought forward on request, since entering barcodes by hand is the slowest part
of adding an item.

`docs/reference/scanner.ts` was **adapted, not rewritten**, per M6's instruction.
All 15 guard references (G1–G5) are intact and no `event.key` read was
introduced — verified by grep: 0 occurrences of `event.key`, 7 of `event.code`.

Three changes were required:

1. The React import sat mid-file in the reference; hoisted so the module is
   valid ESM.
2. Two genuine narrowing gaps that this project's `noUncheckedIndexedAccess`
   catches and the reference's looser config did not: a median-interval array
   index and the EAN weights array. Both fixed with `??` fallbacks, behaviour
   unchanged.
3. A `shouldIgnore` predicate suppresses scanning while a non-barcode text
   input holds focus. In timing mode the heuristic cannot distinguish a scan
   from fast typing, and a barcode landing in the drug-name field is worse
   than a missed scan. Barcode inputs opt back in via `data-scan-target`.

Config lives in `apps/renderer/src/hardware/config.ts` with `prefixCode: null`
(timing mode), because no manual exists for the UP-770pro — see D7. When a
configuration sheet is found, set `prefixCode: 'F9'` there and detection
becomes exact.

**Still outstanding for M6:** the per-screen routing table beyond the item form
(POS, purchase, returns), the Settings → Hardware diagnostics tab, and the
printer work in D6.

---

## D9 — `public_price` is the price of the box

**Decided by the owner (October 2026 audit).** The EDA public price is the price of
the item's largest unit (the box). Strips and tablets may be sold; BR-4 caps each
unit at its share of the box price: `ceil(public_price × unit.factor / box.factor)`
(`packages/core/src/pricing.ts`). Enforced when an item is saved and on general
returns. Previously the schema said "per base unit" while the form, the import and
the returns screens each assumed something different.

## D10 — a batch expiring today is expired

Not sellable today, and shown in the "expired" bucket of the expiry dashboard. All
"today" comparisons use the local (Cairo) date.

## D11 — refunds follow the invoice

A return against a cash invoice refunds cash from the drawer; against a credit
invoice it is credited to the customer's account ("على الحساب") only. Credit notes
are not supported. The refund is the share of what the customer actually paid for
the line (after line and invoice discounts), never list price × quantity.

## D12 — purchase expenses are owed to the supplier

Invoice total = lines after discounts − extra discount + expenses, and that total is
posted to the supplier ledger. Expenses are also folded into landed cost.

## D13 — cash purchases are paid from the safe, not the shift drawer

Confirming a cash purchase posts the purchase and an equal payment to the supplier
ledger (balance unchanged, `paid = total`). It does not touch the shift's expected
cash. Supplier payments (سداد مورد) likewise come from the safe.

## D14 — companies, pharmacies and clinics buy on account by default

A new customer of those account types defaults to payment method "credit"; purchases
from suppliers default to credit.

## D15 — money is shown in EGP, stored in piastres

Everything the user reads or types is in pounds (`fromPiastres` / `MoneyInput`).
Storage stays integer piastres (rule 1) — storing decimal pounds reintroduces
floating-point drift. Line values go through `lineValue()` so a fractional quantity
can never store a non-integer amount.

## D16 — timestamps are local time

All timestamps are written as `datetime('now','localtime')` (`packages/db/src/time.ts`);
migration 0007 converted existing rows. Format remains SQLite's
`YYYY-MM-DD HH:MM:SS` (space, not `T`) for consistency with existing data and range
comparisons — a deliberate deviation from CLAUDE.md rule 3's `T` separator.

## D17 — migration numbers are never reused

Version 5 (`index-active-name-lists`) had been applied to existing databases and the
file was later lost; a new migration reusing number 5 would have been silently
skipped there. The file is restored, new migrations start at 0006, and `migrate()`
now refuses to start when an applied version's recorded name differs from its file.

## D18 — no user accounts: one pharmacy, one operator

**Decided by the owner.** The app serves a single pharmacy and opens straight to
work — no login, no roles, no supervisor approvals. Every write is still recorded in
the append-only audit log (migration 0009) under the built-in operator, user 1,
renamed «الصيدلية» (migration 0012). Narcotics register corrections are a reversal
plus a corrected entry with a mandatory reason (no second signature). If staff
accounts are ever wanted, `users`/`audit_log` already carry `user_id` everywhere.

## D19 — insurance is a split cash invoice

An insured sale is a cash invoice: the company's share (coverage % of covered lines,
excluded items paid by the patient, optional per-invoice cap) is a receivable;
`paid_cash` is the patient's share, so shift close expects exactly that. Claims batch
unclaimed invoices per company and period through draft → submitted → settled (paid
amount + rejected invoices with reasons). A return on an insured invoice refunds the
patient only their share; the company portion (`sales_returns.insurance_portion`) comes
off the claim.

## D20 — receipts: Windows driver or raw ESC/POS

`system` mode prints through the Windows driver of a named printer (any thermal or A5
printer with a driver). `network`/`share` modes rasterise to ESC/POS (D2, guards
P1–P10) and can open the cash drawer. Printing always happens after the sale commits
and never blocks the till (rule 10).

---

## Open, not yet decided

- **Concurrent tills.** Spec §6 targets 3. Blueprint §2.3 is emphatic that two tills
  on one SQLite file over SMB corrupts the database. The `packages/api` seam exists to
  make this a deployment swap (IPC → Fastify/HTTP) rather than a rewrite, but the
  single-till assumption holds until that server exists. Revisit before any multi-till
  deployment.
- **BR-6 negative stock** and **BR-2 expiry warning window** are settings, not
  columns. The `settings` key/value table covers both. No schema change needed; keys
  to be defined when those rules are implemented.
- **BR-7 prescriptions.** Spec M7 implies a prescriptions record. `schema.sql` has no
  `prescriptions` table — `narcotics_register` carries `prescription_no`,
  `doctor_name`, `doctor_syndicate_no`, `patient_name`, `patient_id_no` inline.
  Adequate for the narcotics register; revisit if general prescription tracking is
  needed beyond controlled items.
- ~~**Three customer discount rates.**~~ Resolved — see D8 above.
