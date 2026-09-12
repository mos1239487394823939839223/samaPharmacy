# Scanner & Printer Integration

Windows · Electron · Node.js · Arabic receipts

---

## Part 1 — Barcode Scanner

### 1.1 What you are actually dealing with

Virtually every scanner in an Egyptian pharmacy is a **USB HID keyboard-wedge** device — Symbol/Zebra LS2208, Honeywell Voyager, or an unbranded equivalent. Windows sees it as a second keyboard. It types the barcode and presses Enter. There is no driver, no port, no API.

This is convenient and also the source of every problem below.

### 1.2 The trap that will cost you a day: Arabic keyboard layout

Your UI is Arabic. Staff will have the Windows input language set to Arabic. When the scanner "types" the barcode, Windows applies the active layout, and `KeyboardEvent.key` gives you Arabic letters instead of the barcode characters.

A scan of `6221048` may arrive as digits (the number row is layout-stable) but an alphanumeric code like `PH4501A` arrives as `صح4501ش`. The lookup fails, the pharmacist assumes the item isn't in the system, and you spend a day chasing a phantom database bug.

**The fix is one line of discipline: never read `event.key`. Read `event.code`.**

`event.code` is the physical key position and is layout-independent. `KeyA` is `KeyA` whether Windows is in Arabic, English, or French. Map codes to characters yourself:

```
Digit0–Digit9, Numpad0–Numpad9  →  '0'–'9'
KeyA–KeyZ                       →  'a'–'z' (uppercase when shiftKey)
Minus, Period, Slash, Space     →  literal
```

This single decision removes the entire class of layout bugs. It is implemented in `scanner.ts`.

### 1.3 Detecting a scan versus typing

Two strategies. Use both, prefer the first.

**Strategy A — programmed prefix (reliable).** Every scanner in this class can be programmed by scanning configuration barcodes from its manual. Set a prefix character the scanner sends before every barcode — `F9` is a good choice because nothing else emits it. Detection becomes trivial and 100% accurate: see `F9`, buffer until Enter, done. No timing heuristics, no characters leaking into input fields.

Budget an hour to program the scanners during installation. It is the single highest-value hour in the whole hardware integration.

**Strategy B — timing heuristic (fallback).** Scanners emit characters 5–20ms apart. Humans manage 80–300ms at best. Buffer keystrokes with timestamps; if a run of 4+ characters arrives with gaps under ~35ms and terminates with Enter, it was a scan.

The weakness: by the time you have decided, the first characters have already landed in whatever input has focus. You must remove them. `scanner.ts` handles this by rewriting the focused element's value and dispatching a synthetic `input` event so React's state stays in sync.

### 1.4 Routing scans by screen

A scan means different things in different places. Register a handler per screen rather than one global one:

| Screen | Scan behaviour |
|---|---|
| Sales invoice | Look up barcode → add line at FEFO batch → focus quantity cell |
| Purchase invoice | Add line → focus quantity, then expiry |
| Item form | Fill the barcode field in the multi-barcode table |
| Returns list | Find invoices containing that item (the on-screen hint in image 10 says exactly this) |
| Stock lookup | Jump to the item's batch view |
| Anywhere else | Ignore silently — never beep or error |

### 1.5 Edge cases that show up in real pharmacies

- **Leading zeros.** Treat barcodes as strings, always. `04567` parsed as a number becomes `4567` and never matches.
- **Unknown barcode.** Offer "add this barcode to an existing item" inline rather than an error dialog. Staff will scan an item whose barcode was never registered several times a day, and the fast path to fixing it is what keeps the database clean.
- **Duplicate scans.** A held trigger fires repeatedly. Debounce identical codes within ~300ms.
- **Multiple barcodes per item.** The item form has a repeating barcode table for exactly this reason — the same drug ships with different barcodes across batches and importers.
- **EAN-13 check digit.** Validate it. A failed check digit usually means a misread, not a missing item, and telling the two apart saves confusion.
- **Scanner terminator.** Default is Enter (CR). Some ship with Tab or nothing. Make it a setting and verify at install.

### 1.6 The alternative: node-hid

You can bypass the keyboard entirely by reading the scanner as a raw HID device with `node-hid`. This is immune to layout and focus problems, but requires the device VID/PID, native module compilation against Electron's ABI, and on Windows the device stays attached to the keyboard driver so you get the input twice.

Not worth it. Programmed prefix plus `event.code` solves the same problems for far less effort.

---

## Part 2 — Receipt Printer

### 2.1 Two printing paths, not one

| Path | Use for | Mechanism |
|---|---|---|
| **Thermal ESC/POS** | Sale receipts, shift Z-report, drawer kick | Raw bytes to the printer |
| **A5/A4 driver print** | Full invoices, purchase orders, reports, narcotics register | `webContents.print({ silent: true })` |

Do not try to do everything through one of them. ESC/POS is fast and gives you the cash drawer; the Windows driver gives you real page layout for anything that needs to be filed.

### 2.2 The Arabic problem

This is the part people underestimate.

Arabic is cursive. Every letter has up to four forms depending on its position in the word, and text runs right to left. A thermal printer's built-in font does neither. Even on a printer that supports an Arabic code page (CP864 or CP1256), sending `مرهم` produces four disconnected, reversed letterforms that a customer can technically decipher and a pharmacist will immediately reject.

Making the text path work means doing contextual shaping and bidirectional reordering yourself, then hoping the specific printer model's code page matches. You would be reimplementing a text engine, per printer model.

**Print Arabic receipts as raster images instead.**

Render the receipt as HTML in a hidden `BrowserWindow`, capture it, convert to a 1-bit monochrome bitmap, and send it with the ESC/POS raster command (`GS v 0`). Chromium does the shaping and the RTL layout correctly because that is what it is for. You get any font you want, bold, sizes, and a logo, on any ESC/POS printer regardless of its code page support.

Cost: roughly 1–2 seconds per 80mm receipt versus near-instant for text. That is acceptable because printing happens after the sale is committed, not during it.

Keep a text-mode path for the numbers-only Z-report if you want it fast. Everything customer-facing goes raster.

### 2.3 Connecting on Windows

Three options, in order of preference:

**1. Network printer, TCP port 9100.** A plain socket. No drivers, no native modules, no Windows printer queue in the way, and the printer can be shared across tills. If the pharmacy is buying a printer, buy the Ethernet model.

```js
const socket = net.createConnection(9100, '192.168.1.50');
socket.write(escposBuffer);
```

**2. Shared USB printer via UNC path.** Share the installed printer in Windows, then write raw bytes to `\\localhost\ShareName`. No native module, works with any USB thermal printer.

```js
fs.writeFileSync('\\\\localhost\\POS80', escposBuffer);
```

**3. Native print module.** `@thiagoelg/node-printer` and similar need compiling against Electron's ABI and break on every Electron upgrade. Avoid unless the first two fail.

### 2.4 Cash drawer

The drawer is wired to the printer, not the PC. Opening it is an ESC/POS command sent through the same connection:

```
0x1B 0x70 0x00 0x19 0xFA    // ESC p 0 — pin 2, the common wiring
0x1B 0x70 0x01 0x19 0xFA    // pin 5, if pin 2 does nothing
```

Test both at install. Half the drawers in circulation use pin 5.

Fire it on cash payment confirmation and on manual open (permission-gated and logged — an unlogged drawer-open button is how cash walks).

### 2.5 Printing must never block the sale

The commit sequence is: write the invoice in a database transaction, return success, release the POS screen for the next customer, **then** queue the print job.

If the printer is out of paper, jammed, or unplugged, the sale is already safe in the database. Show a non-blocking toast, hold the job in a retry queue, and let the pharmacist reprint from invoice history once the paper is changed. A modal print error that blocks the till during a queue is a system people learn to hate.

Persist the queue to disk so jobs survive a crash or restart.

### 2.6 Receipt layout, 80mm

Printable width is 72mm ≈ **576 dots** at 203 dpi. (58mm printers: 384 dots.) Design the HTML at exactly that pixel width with no horizontal margin.

```
        [ logo, optional ]
      اسم الصيدلية · الفرع
       العنوان · تليفون
  س.ت: xxxxx   رقم ضريبي: xxxxx
──────────────────────────────
فاتورة رقم: 62341      كاش
26/04/2026  6:37 م
الكاشير: ph/samah
العميل: ...        (when print_name_on_invoice)
──────────────────────────────
الصنف            كمية  سعر  إجمالي
حلمة الجو          1   10.00  10.00
Hepta Panthenol    1   85.00  85.00
PRIVACOND DROPS    1   42.00  42.00
نوبرادكس مرهم      1   63.00  63.00
──────────────────────────────
عدد الأصناف: 4
الإجمالي           200.00 ج.م
الخصم                0.00
المدفوع            200.00
الباقي               0.00
──────────────────────────────
   سياسة الاسترجاع خلال 14 يوم
        شكراً لزيارتكم
     [ barcode of invoice serial ]
```

Printing the invoice serial as a Code128 barcode in the footer makes the returns screen work by scanning the customer's receipt — which is what the hint text in image 10 describes.

Long Arabic item names will wrap. Give the name column the remaining width and let it run to two lines rather than truncating; a pharmacist needs to read what was sold.

### 2.7 Settings to expose

Connection type and address, paper width (58/80mm), copies, auto-print on confirm, drawer pin, header/footer text, logo, and a **Print test receipt** button. Installation is done by whoever sells the system, not by you, and a test button makes that a five-minute job instead of a phone call.

### 2.8 Verify against real hardware early

Buy the actual scanner and printer models the pharmacy will use before you write the second module. Every claim in this document about raster support, drawer pins, and code pages holds for mainstream ESC/POS hardware, but specific cheap models deviate. An afternoon of testing now is worth more than any amount of defensive code.

---

## Part 3 — Implementation Files

| File | Process | Purpose |
|---|---|---|
| `scanner.ts` | Renderer | Layout-safe scan detection, prefix and timing modes, guards, diagnostics |
| `escpos-printer.ts` | Main | ESC/POS transports, HTML→raster Arabic rendering, drawer, guarded queue |

The printer service belongs in the main process — the renderer must never touch sockets or the filesystem.

---

## Part 4 — Guard Reference

Each guard exists because a specific failure is silent, intermittent, or misattributed to the wrong subsystem. That is what makes them worth the code.

### Scanner

| # | Guard | Failure it catches |
|---|---|---|
| G1 | Arabic contamination detector with QWERTY repair | Any path that reads `event.key` instead of `event.code`. Repairs the scan so the counter keeps working, increments `arabicContamination`, and fires `onGuard`. A non-zero counter means a real bug upstream — do not ship relying on the repair path. |
| G2 | Prefix-capture watchdog | A scanner that never sends its terminator. Without this, prefix mode `preventDefault`s every keystroke indefinitely and the keyboard appears dead. Releases after 600ms and reports the misconfiguration. |
| G3 | Idle flush | Scanners shipped with no suffix configured. Evaluates the buffer after a gap instead of waiting forever for Enter. |
| G4 | IME, auto-repeat and modifier suppression | Arabic IME composition events and held triggers producing phantom scans. |
| G5 | Diagnostics and self-test | Timing margins drifting toward the human floor. Surfaces in Settings rather than being discovered mid-queue. |

`Escape` always releases prefix capture, whatever the scanner is doing.

### Printer

| # | Guard | Failure it catches |
|---|---|---|
| P1 | Blank and inverted capture detection | A CSS or font error rendering nothing, then feeding and cutting blank paper for every sale. Also catches an inverted capture that would run the roll out solid black. |
| P2 | Raster dimension limits | A layout bug printing a metre of paper. Hard-fails at 4000 rows and does not retry — retrying would empty the roll. |
| P3 | Arabic font verification | The bundled font failing to load in the offscreen window, silently falling back with different metrics. |
| P4 | Rasterise timeout + single-flight lock | A hung offscreen window stalling the queue or leaking `BrowserWindow` instances. |
| P5 | Paper-out probe | Printing blind into an empty printer and burning through retries. Bidirectional transports only; a non-answering printer is treated as unknown, not faulty. |
| P6 | Drawer pin fallback | Roughly half of drawers in circulation use pin 5. `'auto'` pulses both; `testDrawer()` pulses each with a pause so the installer can see which fires. |
| P7 | Attempt cap + dead letter | One poisoned job blocking every subsequent receipt. After five attempts (or immediately on a fatal render error) the job moves to a dead-letter list and the queue continues. |
| P8 | Atomic queue persistence + size cap | A power cut leaving a truncated queue file. Temp file plus rename. |
| P9 | Transaction guard | Printing awaited inside an open database transaction, holding a write lock across a socket round-trip. Wire it up with `registerTransactionProbe(() => txDepth > 0)` from the db package. |
| P10 | ASCII fallback receipt | Repeated rasterise failures leaving the customer with nothing. Prints invoice number and total in plain ASCII with a note to ask for a reprint. |

### Wiring the guards up

None of this helps if the events go nowhere. Subscribe in the main process and surface them:

```ts
printer.on('event', (e) => {
  if (e.type === 'paper_out') notifyTill('غيّر الورق');
  if (e.type === 'dead')      logger.error('print job abandoned', e.job);
  if (e.type === 'warn')      logger.warn(e.message);
});
```

Put `scanner.diagnostics()` and `printer.verify()` behind a **Hardware** tab in Settings. Installation is done by whoever sells the system, not by you. A screen that says "median scan interval 12ms, prefix mode, Arabic contamination 0" turns a phone call into a five-minute check.

