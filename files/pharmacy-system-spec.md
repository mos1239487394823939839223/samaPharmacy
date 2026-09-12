# Pharmacy Management System — Feature Specification

**Target:** Windows desktop application, single pharmacy (1–3 tills on a local network)
**Market:** Egypt (Arabic-first UI, EDA-regulated pricing, narcotics register)
**Version:** 1.0 — specification for build

---

## 1. Product Summary

A counter-first pharmacy system that handles purchasing, batch-level stock, dispensing, credit, and reporting for a single pharmacy. It must work with no internet connection and must never make the cashier wait.

### Design principles

1. **The counter is the product.** Every other screen exists to keep the sales screen accurate. If a feature slows down the sale, it belongs somewhere else.
2. **Keyboard first.** A trained cashier should complete an entire sale without touching the mouse.
3. **Offline by default.** Internet is used only for optional backup upload and optional e-invoicing. Nothing else may depend on it.
4. **Batches, not products.** Stock is tracked per batch with its own expiry and cost. Aggregate quantity is a computed view, never the source of truth.
5. **Nothing is deleted.** Corrections are reversing entries. Every financial or stock-moving action is in the audit log.

---

## 2. Recommended Technical Stack

| Layer | Recommendation | Why |
|---|---|---|
| Runtime | .NET 8 | Best-supported Windows desktop runtime; single-file deployment |
| UI | WPF | Mature RTL support, fast data grids, good keyboard handling |
| Database (single till) | SQLite | Zero admin, single file, trivial backup |
| Database (2–3 tills) | PostgreSQL or SQL Server Express | Concurrent access over LAN |
| ORM | EF Core or Dapper | Dapper for POS queries where speed matters |
| Reports | QuestPDF or FastReport | Direct PDF/print without a report server |
| Installer | Inno Setup or MSIX | Bundles runtime + DB engine |

**Alternative if the team is web-focused:** Tauri or Electron with React and a local SQLite/Postgres. Costs more memory and startup time but reuses web skills. Avoid a browser-only app — printer and scanner access get awkward.

**Decide upfront:** single-till or multi-till. Going from SQLite to Postgres later is a migration, not a config change.

---

## 3. Domain Model

### 3.1 Core entities

**Product** — one row per sellable SKU.

| Field | Notes |
|---|---|
| `id` | Internal key |
| `barcode` | Primary; support multiple alternates in a child table |
| `name_ar`, `name_en` | Trade name, both required for search |
| `dosage_form` | Tablet, syrup, ampoule, cream, drops, suppository… |
| `strength` | e.g. 500mg |
| `manufacturer_id` | |
| `pack_size` | Base units per pack (e.g. 20 tablets) |
| `sub_pack_size` | Units per strip, for partial sales (e.g. 10) |
| `unit_label_ar/en` | "شريط / قرص" — what a partial unit is called |
| `public_price` | EDA-printed price per pack |
| `is_controlled` | Narcotic / psychotropic flag |
| `control_schedule` | Table 1/2/3 classification |
| `requires_prescription` | Warning flag at POS |
| `needs_refrigeration` | Affects returns and storage reports |
| `shelf_location` | Free text, shown at POS — saves seconds per sale |
| `min_stock`, `max_stock` | Reorder thresholds |
| `is_active` | Soft delete |

**ActiveIngredient** and **ProductIngredient** (`product_id`, `ingredient_id`, `strength`) — many-to-many. This table is what makes substitute search work, and it is the feature that gets used most at the counter. Do not shortcut it with a text field.

**Batch** — the real stock record.

`id`, `product_id`, `batch_number`, `expiry_date`, `qty_on_hand` (in base units), `cost_per_unit`, `purchase_line_id`, `received_date`, `is_quarantined`

**Other entities:** Supplier, PurchaseInvoice, PurchaseLine, PurchaseReturn, Sale, SaleLine, SaleReturn, Customer, CustomerLedgerEntry, InsuranceContract, InsuranceClaim, NarcoticsRegisterEntry, StockAdjustment, StockCount, StockCountLine, Expense, Shift, User, Role, Permission, AuditLog, Setting, PriceChangeHistory.

### 3.2 Key modelling rules

- **All quantities stored in base units** (individual tablets/ml), never packs. Pack/strip is a display and entry convenience. This prevents the classic rounding bug when a box is opened.
- **Cost is per batch, not per product.** Profit on a sale line uses the cost of the specific batch dispensed.
- **Public price lives on the product; actual sale price lives on the sale line.** When EDA changes a price, old batches were bought at old cost — you need `PriceChangeHistory` to explain margin swings.
- **Sale lines reference batches.** One sale line per batch, so selling 3 boxes from 2 batches creates 2 lines.

---

## 4. Modules

### M1 — Master Data

- Product CRUD with duplicate-barcode and duplicate-name detection
- Active ingredient management; assign one or many per product
- Manufacturers, suppliers, therapeutic categories
- Bulk price update (import EDA price list, preview changes, apply, log to history)
- Barcode label printing for items with no printed barcode
- **Initial data load:** the system is unusable without a seeded Egyptian drug database (~25–35k SKUs with trade name, ingredient, form, price). Plan to import from a purchased/licensed list or a supplier catalogue export. Build a CSV/Excel importer with column mapping, validation preview, and error report. Treat this as a real work item, not a footnote.

### M2 — Purchasing

- Purchase invoice entry: supplier, invoice number, date, due date
- Per line: product, qty, **bonus/free qty**, cost price, discount %, batch number, expiry date
- Bonus quantity must reduce effective unit cost across the received quantity
- Invoice-level discount distributed across lines for accurate costing
- Receiving creates batches; posting is a distinct step from drafting
- Purchase returns (expired, damaged, wrong item) with credit note against supplier
- Supplier ledger: invoices, payments, credit notes, running balance, aging buckets
- Reorder suggestion screen: items below `min_stock` or with N days of cover remaining, grouped by usual supplier, exportable as an order

### M3 — Inventory

- Live stock view by product, expandable to batches
- **FEFO allocation** — first expiry, first out, by default at POS
- Expiry dashboard: expired / 30 / 60 / 90 / 180 days, with value at cost
- Quarantine a batch (stops it being sold without deleting it)
- Stock adjustments with mandatory reason code (damage, theft, expiry write-off, correction) and permission gate
- Physical stock count: generate count sheets by shelf location, enter counted quantities, review variance report, post adjustments in one transaction
- Dead stock report: no movement in N days
- Optional stock transfer module — stub it now, leave the schema ready for a second branch

### M4 — Sales / POS

This screen determines whether the system gets adopted. Specify it tightly.

**Search.** One input box that resolves:
- Barcode scan → immediate line add
- Arabic or English trade name, matching from the start of any word
- Active ingredient name → shows every product containing it
- Arabic normalization is mandatory: أ/إ/آ/ا, ة/ه, ي/ى, and tashkeel stripped. Without this, search feels broken.
- Target: results rendered in under 200 ms with 30,000 products

**Result row shows:** name, strength, form, price, quantity on hand, nearest expiry, shelf location, and an alternatives indicator.

**Alternatives panel.** One key press from any selected item shows every product sharing its active ingredient(s), with price and stock, sorted by availability then price. This is the single highest-value feature at the counter.

**Line entry.**
- Quantity in packs, strips, or units — switchable per line
- Batch auto-picked by FEFO; overridable by permitted users
- Line discount and whole-invoice discount, each permission-gated
- Price is editable downward only; selling above `public_price` is blocked
- Warnings: prescription-required, refrigerated item, batch expiring within N days

**Invoice handling.**
- Hold and resume multiple open invoices (customer walks off to get money)
- Payment: cash, card, credit to customer account, insurance, or split
- Change calculation with a large, readable display
- Print A5 or 80mm thermal receipt; reprint from history with a "reprint" mark
- Whole function-key map published on screen (F1 search, F2 alternatives, F3 discount, F4 hold, F12 pay, etc.)

**Controlled items.** Adding a controlled product forces a prescription entry dialog (prescription serial, doctor name and syndicate number, patient name and ID) before the sale can be completed. No bypass.

### M5 — Returns

- Return against an existing invoice (preferred) — pick lines, partial quantities allowed
- Return without invoice, permission-gated, price capped at current public price
- Returned stock goes back to its original batch, or to quarantine if the reason is damage
- Refund as cash, credit note, or reduction of customer balance
- Return window enforced by setting (e.g. 14 days); refrigerated items blocked from resale by default

### M6 — Customers, Credit and Insurance

- Walk-in default customer requiring zero data entry
- Registered customers: name, phone, address, notes, credit limit
- Credit sales post to customer ledger; block or warn at limit
- Payment collection screen, receipt printing, aging report
- Insurance contracts: company, coverage %, co-pay, excluded items, approval number requirement
- Insurance sale splits the total into patient-paid and company-receivable portions
- Claim batching: select unbilled insurance sales for a period, generate a claim statement, mark as submitted, record settlement and any rejected lines

### M7 — Prescriptions and Narcotics Register

- Prescription record: date, doctor, patient, items dispensed, linked sale
- **Narcotics register** — a sequential, gapless, append-only log of every controlled item in and out, with batch, prescription serial, prescriber details, patient ID and running balance per product
- Entries cannot be edited or deleted; corrections are reversing entries with a reason and a supervisor approval
- Printable in a format matching the inspection logbook
- Balance reconciliation report: opening + purchases − dispensed − returns = physical count

### M8 — Cash, Shifts and Expenses

- Shift open with declared opening float, tied to a user
- Shift close: system totals by payment method vs counted cash, variance recorded and requiring a note when non-zero
- Petty cash expenses with categories, deducted from drawer
- Cash drop/safe transfer entries
- Z-report printed at close; no editing a closed shift

### M9 — Reporting

Every report: date range filter, print, and export to Excel and PDF.

**Sales:** daily summary, by hour, by cashier, by payment method, invoice list with drill-down.
**Profit:** gross profit by period, by product, by category, by supplier. Uses batch cost.
**Inventory:** stock valuation at cost and at retail, expiry by bucket, below-minimum, dead stock, movement history per product.
**Purchasing:** purchases by supplier, price change tracking, bonus received.
**Receivables:** customer aging, insurance outstanding by company.
**Payables:** supplier aging, due this week.
**Operational:** top 50 and bottom 50 movers, returns analysis with reasons, discount report by user, void/edit log.
**Compliance:** narcotics register, narcotics reconciliation.

### M10 — Users, Roles and Audit

Suggested roles: Owner, Pharmacist-in-charge, Pharmacist, Cashier, Data Entry.

| Capability | Cashier | Pharmacist | Manager | Owner |
|---|---|---|---|---|
| Sell | ✓ | ✓ | ✓ | ✓ |
| Line discount up to X% | — | ✓ | ✓ | ✓ |
| Discount above X% | — | — | ✓ | ✓ |
| Return without invoice | — | — | ✓ | ✓ |
| Override FEFO batch | — | ✓ | ✓ | ✓ |
| Dispense controlled items | — | ✓ | ✓ | ✓ |
| Edit product / price | — | — | ✓ | ✓ |
| Stock adjustment | — | — | ✓ | ✓ |
| View cost and profit | — | — | ✓ | ✓ |
| Close shift | ✓ | ✓ | ✓ | ✓ |
| Manage users | — | — | — | ✓ |
| Restore backup | — | — | — | ✓ |

Supervisor override: a permitted user can authorize a blocked action in-place by entering credentials, logged as an override event.

Audit log captures user, timestamp, machine, action, entity, before/after values for: price changes, discounts above threshold, stock adjustments, returns without invoice, batch overrides, voided invoices, user/permission changes, backup restores.

### M11 — System

- **Backup:** automatic on close and on schedule, to a local folder plus a second configured destination (USB or network). Retention policy. Restore wizard with an explicit confirmation, logged. Test-restore reminder every 30 days — untested backups are not backups.
- Settings: pharmacy name and licence details for receipt header, tax registration, expiry warning threshold, negative stock policy, return window, rounding rule, discount ceilings per role, receipt format.
- Hardware: barcode scanner as keyboard wedge (no driver work), ESC/POS thermal printer, A5 laser, cash drawer via printer kick-out, optional customer display.
- Arabic/English UI toggle with full RTL mirroring, Arabic-Indic numeral option on receipts.
- Data import/export: products, customers, suppliers, opening stock.

---

## 5. Business Rules

| # | Rule |
|---|---|
| BR-1 | Expired batches cannot be sold. Hard block, no override. |
| BR-2 | Batches within the expiry warning window are sold only after an explicit confirmation, logged. |
| BR-3 | Default dispensing is FEFO. Override requires permission and is logged. |
| BR-4 | Sale price may never exceed `public_price`. |
| BR-5 | Selling below batch cost requires manager permission. |
| BR-6 | Negative stock is blocked by default; if enabled by setting, flagged on a daily exception report. |
| BR-7 | Controlled items cannot be dispensed without a completed prescription record. |
| BR-8 | Posted invoices are never edited. Corrections are credit notes or reversing entries. |
| BR-9 | Bonus quantities reduce weighted average cost of the received batch. |
| BR-10 | A closed shift is immutable. |
| BR-11 | Batch number plus expiry plus product must be unique; a repeat receipt adds to the existing batch. |
| BR-12 | Refrigerated items returned by a customer go to quarantine, never back to sellable stock, unless overridden by the pharmacist-in-charge with a note. |

---

## 6. Non-Functional Requirements

| Requirement | Target |
|---|---|
| POS search response | < 200 ms at 30k products |
| Complete a cash sale of 3 items | < 20 seconds, keyboard only |
| Application start to POS ready | < 5 seconds |
| Receipt print latency | < 2 seconds |
| Internet dependency | None for any core function |
| Concurrent tills | 3 |
| Data retention | 7 years, searchable |
| Backup | Automated daily, two destinations, restore tested monthly |
| Localization | Arabic and English, full RTL |
| Minimum hardware | 4 GB RAM, Windows 10 64-bit, 128 GB storage |

---

## 7. Regulatory Notes (Egypt)

- **Pricing** is set by the Egyptian Drug Authority; the printed pack price is the legal maximum. The system enforces this, and needs a workable bulk price-update path for when circulars are issued.
- **Narcotics and psychotropics** require a maintained register with prescriber and patient details, retained for inspection. Treat M7 as a compliance feature, not a reporting nicety.
- **E-invoicing (ETA)** — verify current applicability to your business form and turnover before committing. Design the `Sale` entity with nullable `eta_uuid` and `eta_status` fields so integration can be added without a migration, but keep it out of the MVP unless it is confirmed mandatory for you.
- **Pharmacist presence** — the responsible pharmacist's licence details belong on receipts and reports.

Confirm all four with your accountant or the Pharmacists Syndicate before launch. Regulations change and I am not a lawyer.

---

## 8. Screen Inventory

| # | Screen | Priority |
|---|---|---|
| 1 | Login / user switch | P0 |
| 2 | POS — sales | P0 |
| 3 | Product search and alternatives | P0 |
| 4 | Product editor | P0 |
| 5 | Purchase invoice entry | P0 |
| 6 | Stock by product and batch | P0 |
| 7 | Expiry dashboard | P0 |
| 8 | Shift open / close | P0 |
| 9 | Daily sales report | P0 |
| 10 | Returns | P1 |
| 11 | Customers and ledger | P1 |
| 12 | Suppliers and ledger | P1 |
| 13 | Reorder suggestions | P1 |
| 14 | Reports hub | P1 |
| 15 | Users and permissions | P1 |
| 16 | Settings | P1 |
| 17 | Backup and restore | P1 |
| 18 | Narcotics register | P2 |
| 19 | Insurance contracts and claims | P2 |
| 20 | Physical stock count | P2 |
| 21 | Bulk price update | P2 |
| 22 | Data import wizard | P2 |
| 23 | Audit log viewer | P2 |

---

## 9. Delivery Phases

**Phase 1 — Operating system of the pharmacy (P0).**
Master data and import, purchasing, batch inventory, POS with alternatives search, expiry handling, shifts, daily sales and stock reports, users, backup.
*Exit criterion: the pharmacy can run a full day on it without paper.*

**Phase 2 — Money and control (P1).**
Returns, customer credit, supplier ledger and aging, reorder suggestions, full report set, permissions and audit log, discount controls.
*Exit criterion: the owner can close the month from the system.*

**Phase 3 — Compliance and depth (P2).**
Narcotics register, insurance contracts and claims, physical stock count, bulk price updates, audit viewer, e-invoicing if required.

**Phase 4 — Optional.**
Second branch and transfers, WhatsApp refill reminders, loyalty, owner dashboard on mobile.

---

## 10. Open Decisions

1. **Drug database source.** Licensed catalogue, supplier export, or manual build? This gates Phase 1 and is the most common cause of stalled pharmacy projects.
2. **Single till or multi-till from day one.** Determines SQLite vs PostgreSQL.
3. **Insurance contracts** — does this pharmacy actually work with insurers? If not, M6's insurance half drops out and Phase 3 shrinks considerably.
4. **E-invoicing applicability** — confirm before Phase 1 architecture is frozen.
5. **Existing data migration** — is there stock, customer, or supplier data in another system to bring across?
6. **Receipt hardware already owned** — determines whether to target thermal, A5, or both at launch.
