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
- **Three customer discount rates.** Blueprint §5.4 flags that the semantics are
  unconfirmed; `schema.sql` comments say the same ("confirm semantics before use").
  Must be settled before M8 credit work.
