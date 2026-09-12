# Architecture & UI Blueprint

**Stack:** Electron + React + Node.js + SQLite
**Reference:** PharmaSyst RC 13.4.5 screenshots
**Companion:** `schema.sql`

---

## 1. What the Screenshots Establish

### 1.1 Navigation model

A persistent top toolbar of six modules, each with a global shortcut, plus a collapsible right-side drawer for everything else. The toolbar is always visible, even inside a form — you can jump from a half-finished customer record straight to a sale.

| Module | Arabic | Shortcut |
|---|---|---|
| Sales | المبيعات | `Ctrl+Shift+N` |
| Returns | المرتجع | `Ctrl+Shift+U` |
| Purchases | المشتريات | `Ctrl+Shift+P` |
| Items | الأصناف | `Ctrl+Shift+T` |
| Customers | العملاء | `Ctrl+Shift+C` |
| History / Log | السجل | `Ctrl+H` |

Drawer tree:

```
الرئيسية
├── العملاء ─ العملاء · التقارير
├── الأصناف ─ الأصناف · ابن سينا مباشر
├── المخازن
├── المبيعات ─ فواتير المبيعات · تسليم الدرج
│              · مرتجع فواتير البيع · مرتجع بيع عام · التقارير
├── المشتريات ─ فواتير الشراء · مرتجعات فواتير الشراء · مرتجعات شراء عام
└── الحسابات ─ صرف وتوريد نقدية
```

Note the pairing that repeats in both sales and purchases: an **invoice-linked return** (`مرتجع فواتير البيع`) and a **general return** (`مرتجع بيع عام`) with no source invoice. Build both; they have different permission levels and different pricing rules.

### 1.2 Form shortcuts

| Action | Key |
|---|---|
| Save form | `Ctrl+Shift+S` |
| Cancel / close | `ESC` |
| Back | `Shift+ESC` |
| Add grid row | `F12` or `Insert` |
| Save invoice | `Ctrl+F10` |
| Hold invoice | `Ctrl+N` |
| Hold and switch to sales invoice | `Ctrl+Alt+N` |
| Switch invoice tab | `Ctrl+B` |

The user menu (image 1) has toggles for showing button shortcut badges and favourite shortcuts. Those blue `Ctrl+Shift+X` chips under each toolbar icon are a display option, not permanent chrome. Copy this — it trains new staff and then gets switched off.

### 1.3 Screens observed

| Screenshot | Screen | Key detail |
|---|---|---|
| 7 | فواتير المبيعات (POS) | Tabbed invoices, per-line expiry and stock, warehouse + invoice type in header |
| 9 | فاتورة شراء | Supplier autocomplete, bonus column, expenses and extra discount at header |
| 10 | مرتجع بيع list | Date-range filter, per-column search, 318 pages × 10 rows over two weeks |
| 8, 4 | اضافة عميل | Two-screen customer form, heavy CRM fields |
| 11, 6 | اضافة صنف | Four tabs, scientific data, multi-barcode, scientific groups |

### 1.4 Field inventory — Items (`اضافة صنف`)

Tabs: `المعلومات الأساسية` · `الأسعار و الوحدات` · `بيانات مورد الصنف` · `اعدادات الصنف`

Basic tab:
- نوع الصنف (item type, required), مؤشر الصنف (internal index), الكود الدولي (international/EAN code)
- اسم الصنف باللغة العربية (required), اسم الصنف باللغة الانجليزية
- منشأ الصنف — محلي / مستورد, اسم الشركة المنتجة, طبيعة الصنف
- **بيانات علمية:** الاسم العلمي, المادة الفعالة الأساسية, نسبة المادة الفعالة الأساسية %, `ليس له تاريخ صلاحية` checkbox
- صنف جدول (schedule/controlled classification), صنف تخزين (storage temperature)
- بيانات اضافية: مكان الصنف (shelf location)
- **اضافة باركود اخر للصنف** — repeating table, many barcodes per item
- **المجموعات العلمية** — repeating table, many scientific groups per item

The separate `الأسعار و الوحدات` tab is where pack/strip/unit definitions and prices live. The sales grid shows `علبة` as a per-line unit, so units are per-item configurable with their own prices.

### 1.5 Field inventory — Customers (`اضافة عميل`)

- مؤشر العميل (auto, 60462 observed), اسم العميل*, رقم الموبايل1*, رقم الموبايل2, البريد الإلكتروني
- **اسم صاحب الصيدلية, رقم هاتف الصيدلية** — customers can be pharmacies
- Tag input (`اكتب تاج ثم اضغط ادخال`), ملاحظات
- نوع حساب العميل — فرد / …, `تابع لـ` (parent account), شركة التقسيط, فئة التقسيط
- طريقة الدفع — كاش / آجل, الرصيد الافتتاحي, الرقم التأميني
- عميل VIP, طباعة اسم العميل على الفاتورة, إيقاف حساب العميل
- **Three discount percentages** plus `البيع بسعر التكلفة` (sell at cost) flag
- Addresses table: عنوان التوصيل, المحافظة, المدينة, المنطقة
- Demographics: النوع, الحالة الاجتماعية, تاريخ الميلاد, لدى أبناء + عدد الأبناء

### 1.6 Sales grid columns (image 7)

`#` · كود الصنف · إسم الصنف · الكمية · الوحدة · تاريخ الصلاحية · الرصيد · السعر · قيمة ق.خ · قيمة ب.خ · خصم · delete

> **Correction (resolved):** this line originally read `قيمة ن.خ`. That was a
> transcription error — the column is `قيمة ب.خ`, matching the Confirmed note
> below, `sales_invoice_lines.value_after_discount` in `schema.sql`, and the
> ق/ب before-after pairing used on the purchase grid.

Header: المخزن · نوع الفاتورة · ق.خ إضافي % · ن.خ إضافي · مبلغ إضافي · الاجمالي · بحث عميل · توصيل منزلي · الملاحظات
Footer: عدد الأصناف · الاجمالي

**Confirmed:** `ق` = قبل (before), `ب` = بعد (after). So `قيمة ق.خ` is the line value before discount and `قيمة ب.خ` the value after it, with the `خصم` column carrying the discount itself. The same convention explains `ق.ض` / `ب.ض` on the purchase grid as before and after tax.

This means the grid shows the arithmetic, not just the result — the cashier can see what a discount did to the line. Worth preserving.

### 1.7 Purchase grid (image 9)

Adds **بونص** (free goods) and **الرصيد الحالي** next to quantity, with expiry captured per line. Header carries قيمة المصاريف (landed expenses), قيمة/نسبة الخصم الإضافي, and الرصيد الحالي للمورد. Supplier is an autocomplete over the supplier list.

Bonus quantity plus header-level expenses and discount means **landed cost per unit is computed, not typed**. That calculation is the most financially sensitive code in the system.

### 1.8 Scale signal

The returns list shows 318 pages at 10 rows across a two-week window and invoice serials near 62341. That is roughly 200+ invoices a day. Design the invoice list for tens of thousands of rows with server-side paging and per-column filtering from day one — not client-side filtering over a full table load.

---

## 2. Stack Architecture

### 2.1 Process model

```
┌─ Electron main (Node) ──────────────────────────┐
│  printing · backup · ESC/POS · window · menu     │
│            ↕ message port                        │
│  ┌─ utilityProcess ───────────────────────────┐  │
│  │  better-sqlite3 · repositories · domain     │  │
│  └────────────────────────────────────────────┘  │
└──────────────── IPC (contextBridge) ─────────────┘
                        │
┌─ Renderer (React) ──────────────────────────────┐
│  UI only. No fs, no DB, no node integration.     │
└──────────────────────────────────────────────────┘
```

> **Resolved:** the original diagram showed SQLite inside main. It illustrated
> the *trust boundary*, not the process layout. Per §2.2 below and CLAUDE.md
> rule 6, `better-sqlite3` runs in a `utilityProcess` from the start —
> retrofitting it later means rewriting every call site.

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. The renderer talks to a typed preload API, never to SQLite.

**better-sqlite3 is synchronous.** Long queries block the main process and freeze the window. Move the database into a `utilityProcess` (Electron 22+) and message-pass to it. Do this at the start; retrofitting it later means rewriting every call site.

### 2.2 Why these choices

| Concern | Choice | Reasoning |
|---|---|---|
| SQLite driver | `better-sqlite3` | Fastest, synchronous API, no callback overhead. Needs `@electron/rebuild` against Electron's ABI — wire this into `postinstall` on day one. |
| Query layer | `drizzle-orm` or `kysely` | Typed SQL without an ORM's abstraction tax. Avoid heavyweight ORMs for a POS. |
| Build | `electron-vite` | Handles main/preload/renderer with one config. Hand-rolling webpack here wastes a week. |
| Packaging | `electron-builder` + NSIS | Standard Windows installer, code signing, per-machine install. |
| Grid | AG Grid Community (MIT) | The invoice grids need real keyboard navigation, cell editors, and RTL. This is the one place not to build your own. |
| Server state | TanStack Query | Caching and invalidation for lists and lookups. |
| Local state | Zustand | Invoice tabs, open drawer, session. |
| Forms | react-hook-form + zod | The item and customer forms have 40+ fields across tabs. |
| Styling | Tailwind with `dir="rtl"` and logical properties | Or MUI + stylis-plugin-rtl if you want components out of the box. |
| Font | Cairo or Tajawal | System Arabic fonts on Windows render poorly at small sizes in dense grids. |

### 2.3 The multi-till decision

SQLite is a file, not a server. Two tills over a Windows share will corrupt the database — this is not a theoretical risk.

Structure the code so this stays a deployment choice, not a rewrite:

```
packages/core        pure domain logic, no I/O
packages/db          repositories over better-sqlite3
packages/api         thin service layer  ← the seam
apps/desktop         Electron main + preload
apps/renderer        React
```

Every UI call goes through `packages/api`. Today it runs in-process. When a second till arrives, the same layer gets mounted behind Fastify on the back-office machine and the client swaps its transport from IPC to HTTP. Nothing above the seam changes.

### 2.4 Non-negotiable SQLite settings

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
```

`foreign_keys` is OFF by default in SQLite and must be set per connection. Forget it and you silently accumulate orphaned invoice lines.

### 2.5 Money and quantity

**Store money as integers in piastres.** SQLite has no decimal type, and `REAL` will drift — 200.00 becomes 199.99999999999997 after enough arithmetic, and it will show up on a receipt eventually. A helper module with `toPiastres()` / `format()` and no float arithmetic anywhere else.

**Store quantity as integers in base units** (individual tablets, ml). `علبة` and `شريط` are display conversions via the item's unit table.

**Store dates as ISO-8601 text** (`YYYY-MM-DD`) for expiry and `YYYY-MM-DDTHH:mm:ss` for timestamps. Text sorts correctly and stays readable in a raw dump at 2am.

### 2.6 Arabic search

This is the feature that decides whether staff like the system.

Normalize on write into a dedicated column:

```js
const normalizeAr = (s) => s
  .replace(/[\u064B-\u0652\u0640]/g, '')   // tashkeel + tatweel
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .replace(/ؤ/g, 'و')
  .replace(/ئ/g, 'ي')
  .toLowerCase()
  .trim();
```

Store `name_ar_norm`, `name_en_norm`, `ingredient_norm`. Without this, searching `ادول` misses `أدول` and the pharmacist concludes the item isn't in stock.

**For sub-200ms results:** load the full item index into memory at startup. 35,000 items × ~250 bytes is under 10 MB. Filter in JavaScript against the normalized strings with a 120ms debounce. Refresh the index when items change. Hitting SQLite on every keystroke through IPC will not feel instant no matter how you index it.

FTS5 has no Arabic-aware tokenizer worth using here. Skip it.

### 2.7 Keyboard shortcuts in Electron

`Ctrl+Shift+N`, `Ctrl+Shift+T` and `Ctrl+N` are Chromium defaults (new incognito window, reopen tab, new window). Remove the default application menu with `Menu.setApplicationMenu(null)` and register your own accelerators, or they will fight you.

Use `before-input-event` on `webContents` rather than `globalShortcut` — global shortcuts are captured system-wide even when the app is in the background, which will annoy anyone using the machine for anything else.

### 2.8 Hardware

> **SUPERSEDED (resolved).** This section is the early take. The authority is
> `docs/hardware-scanner-and-printer.md` plus the implementations in
> `docs/reference/`. Two corrections that matter:
>
> - **Scanner must read `event.code`, never timing alone.** Under a Windows
>   Arabic input layout, `.key` returns Arabic letters for a scanned barcode
>   (`PH4501A` → `صح4501ش`). Timing detection is the *fallback* mode; the
>   primary mode is a programmed `F9` prefix. See CLAUDE.md rule 4.
> - **Printer must raster Arabic, not send text.** `node-thermal-printer` has
>   no contextual letter shaping and no RTL, so Arabic prints as disconnected
>   reversed letterforms on any code page. Render HTML in a hidden
>   `BrowserWindow` and send a 1-bit bitmap via `GS v 0`.
>
> Retained below for historical context only. Do not implement from it.

- ~~**Barcode scanner** — a keyboard wedge. Detect scans by inter-keystroke timing (under ~30ms between characters, terminated by Enter) rather than a dedicated input.~~
- ~~**Receipt printer** — `node-thermal-printer` for ESC/POS in the main process.~~
- **Cash drawer** — opened by the printer's kick-out command, not by a separate driver. (Still accurate; pin 2 vs pin 5 handled by guard P6.)

### 2.9 Backup

`better-sqlite3` exposes `db.backup()`, which is safe on a live database. Do not copy the `.db` file while WAL is active — you will get a corrupt or stale copy.

Run on shift close and on a timer: backup to a dated local file, copy to a second configured path (USB or network), keep 30 days, and log every run. Surface a warning in the UI if the last successful backup is over 24 hours old.

---

## 3. Screen Build Order

| # | Screen | Depends on | Notes |
|---|---|---|---|
| 1 | Shell: toolbar, drawer, shortcut layer, RTL | — | Get the keyboard model right before any real screen |
| 2 | الأصناف list + اضافة صنف (4 tabs) | — | Including multi-barcode and scientific groups |
| 3 | Item import wizard | 2 | CSV/Excel with column mapping and validation preview |
| 4 | المخازن | — | Even one pharmacy has main store + front counter |
| 5 | Suppliers | — | |
| 6 | فاتورة شراء | 2, 4, 5 | Creates batches. Landed cost calculation lives here |
| 7 | Stock view by item and batch | 6 | |
| 8 | **فواتير المبيعات** | 2, 4, 7 | The main event. Budget generously |
| 9 | تسليم الدرج | 8 | |
| 10 | العملاء (both screens) | — | |
| 11 | Credit sales + customer ledger | 8, 10 | |
| 12 | مرتجع فواتير البيع | 8 | |
| 13 | مرتجع بيع عام | 12 | |
| 14 | Purchase returns (both) | 6 | |
| 15 | صرف وتوريد نقدية | 9 | |
| 16 | Reports hub | all | |
| 17 | السجل / audit viewer | all | |
| 18 | Users and permissions | — | Can ship with a single owner login for pilot |
| 19 | Narcotics register | 8 | Compliance, but not needed to pilot |

Screen 8 will take as long as screens 1–7 combined. Plan for that rather than discovering it.

---

## 4. POS Screen Requirements

The single screen that determines adoption.

**Search box behaviour.** One input, resolving barcode (exact, immediate line add), Arabic name, English name, and active ingredient. Results show name, unit, price, stock balance, nearest expiry, and shelf location. Arrow keys move, Enter selects, Tab moves to quantity.

**Alternatives panel.** One keystroke from any line shows every item sharing the active ingredient, with stock and price, sorted by availability then price. The screenshots show the ingredient fields on the item form; this is what they are for.

**Batch selection.** FEFO by default, with the chosen expiry visible in the line as PharmaSyst does. Expired batches blocked outright; near-expiry requires confirmation.

**Invoice tabs.** Multiple concurrent invoices, `Ctrl+B` to cycle, held invoices surviving an application restart. A customer walking off to find money must not block the queue.

**Nothing on this screen may require the mouse.** Test by unplugging it.

---

## 5. Things the Screenshots Imply That Need Decisions

1. **`ابن سينا مباشر`** — direct ordering from Ibn Sina Pharma. This needs a commercial agreement and API access from the distributor. Treat as a Phase 3 integration and confirm feasibility early, because it may be a reason pharmacies stay on PharmaSyst.
2. **B2B customers** — `اسم صاحب الصيدلية` and clinic customers in the returns list mean wholesale pricing tiers, not just retail. Decide whether you are building this.
3. **Installment companies** (`شركة التقسيط`, `فئة التقسيط`) — a third-party financing flow. Confirm whether this pharmacy uses it.
4. **Three customer discount rates** — establish which applies when before modelling. Likely cash rate, credit rate, and an invoice-total override.
5. **`مؤشر العميل` / `مؤشر الصنف`** — human-facing sequential codes distinct from primary keys. Reserve them as their own sequence table.

---

## 6. Project Skeleton

```
pharmacy/
├── apps/
│   ├── desktop/
│   │   ├── src/main/          window, menu, shortcuts, printing, backup
│   │   ├── src/db-process/    utilityProcess hosting better-sqlite3
│   │   └── src/preload/       typed contextBridge surface
│   └── renderer/
│       ├── src/modules/       sales · purchases · items · customers · reports
│       ├── src/components/    grid, shortcut layer, toolbar, drawer
│       └── src/lib/           arabic.ts, money.ts, ipc.ts
├── packages/
│   ├── core/                  pricing, landed cost, FEFO, discounts
│   ├── db/                    schema, migrations, repositories
│   ├── api/                   service layer — the IPC/HTTP seam
│   └── shared/                types, IPC contracts, zod schemas
└── electron.vite.config.ts
```

Put the landed-cost and FEFO logic in `packages/core` as pure functions with no database access. They are the two places where bugs cost real money, and pure functions are the only ones you will actually write tests for.

---

## 7. Known Traps

| Trap | Consequence |
|---|---|
| `better-sqlite3` not rebuilt for Electron ABI | `NODE_MODULE_VERSION` mismatch on first run of the packaged app, after it worked fine in dev |
| Floats for money | Wrong totals on receipts, months in, irreproducible |
| `PRAGMA foreign_keys` not set | Silent orphan rows |
| DB calls on the main process | Window freezes during reports |
| Two tills on one SQLite file over SMB | Database corruption |
| No Arabic normalization | Staff conclude stock is missing and reorder it |
| Chromium default shortcuts left enabled | `Ctrl+N` opens a browser window mid-sale |
| Copying the `.db` file as backup while WAL is active | Unusable backup, discovered during a restore |
| Client-side filtering of the invoice list | Unusable by month three at 200 invoices a day |
