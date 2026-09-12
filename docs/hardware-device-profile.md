# Hardware Profile — Actual Devices

The two devices in the pharmacy, and what they change.

---

## Printer — Xprinter XP-233B

### Confirmed specification

| Property | Value | Consequence |
|---|---|---|
| Resolution | 203 dpi (8 dots/mm) | — |
| Emulation | TSPL (labels) **and** ESC/POS (receipts) | Must be switched into ESC/POS mode |
| Printable width, receipt mode | **48mm = 384 dots** | Receipt template must be redesigned |
| Printable width, label mode | 56mm | Usable for item barcode labels |
| Media width | 20–60mm | Use 58mm thermal roll for receipts |
| Interface | **USB only** | No network transport, no status read-back |
| Drawer port | 1 port, **pin 2** | No pin guessing needed |
| Cutter | None — tear bar | Must not rely on the cut command |
| Print speed, receipt | 90mm/s max | ~2–3s for a rastered receipt |
| Buffer | 4096 KB | Comfortably holds a full raster |
| Sensors | Paper end, cover open, **gap** | Gap sensor must be disabled for receipts |

### Config

```ts
import { DEVICE_PROFILES, PrinterService } from './escpos-printer';

const printer = new PrinterService(
  {
    ...DEVICE_PROFILES.XP233B,   // 384 dots, pin 2, hasCutter: false
    transport: 'share',
    shareName: 'XP-233B',
    arabicFontUrl: 'file:///fonts/Cairo-Regular.ttf',
  },
  app.getPath('userData') + '/print-queue.json'
);
```

### What changed in the code

1. **`transport: 'share'`, not `'network'`.** USB only. Share the printer in Windows under an exact name and write raw bytes to `\\localhost\<ShareName>`. The network path in the module is now unusable for this device.
2. **`hasCutter: false`.** The cut command is replaced with an extra paper feed so the receipt clears the tear bar. Sending a cut to a printer without a cutter leaves the last two lines stuck inside the mechanism.
3. **`widthDotsOverride: 384`.** The media is 58mm but the printable area is 48mm. Rendering at media width clips the right edge.
4. **Receipt template now switches layout below 450 dots.** A four-column table cannot hold an Arabic drug name in 384 dots — `Hepta Panthenol skin cream 50 gm` alone would consume the row. The narrow layout puts the name on its own line with `qty × price` and the total beneath it.
5. **P5 paper-out probe returns unknown.** The printer has a paper-end sensor, but the raw share transport is write-only. The guard degrades to "unknown" and the queue proceeds rather than blocking. Staff notice an empty roll faster than software will here.
6. **P6 drawer fallback is unnecessary** but left enabled. Pin 2 is confirmed, so set `drawerPin: 2` and skip the auto-pulse.

### Setup procedure

1. Install the Xprinter Windows driver, then **share the printer** with a name containing no spaces.
2. Put the printer into **ESC/POS emulation**. It ships in whichever mode the seller left it. Use the Xprinter utility — if it is in TSPL mode, raster receipts will print as garbage or nothing at all.
3. Set the **paper sensor to continuous**, not gap. On continuous receipt roll with the gap sensor active, the printer feeds several centimetres per print hunting for a label gap that does not exist. This wastes paper on every sale and looks like a software bug.
4. Load 58mm thermal roll.
5. Run **Settings → Hardware → Test receipt**. Check that Arabic letters are **joined** and right-aligned, and that nothing is clipped on the right edge.
6. Run **Test drawer**. Pin 2 should fire.

### Worth knowing

**This printer can print your item barcode labels.** The item form has a repeating barcode table, and plenty of stock arrives with no scannable barcode. In TSPL mode at 56mm this prints label stock. That is a genuine bonus feature — but switching emulation mid-shift is awkward, so treat labels as a back-office task, not a counter one.

**Consider a second printer eventually.** At roughly 200 invoices a day, a 48mm receipt is cramped and 2–3 seconds per print adds up. A dedicated 80mm receipt printer at the counter, with the XP-233B kept for labels, is the better end state. It is not urgent — the code handles both — but budget for it.

---

## Scanner — UP-770pro

A generic Chinese handheld. Class 2 **LED** product, so a linear imager rather than a laser — 1D only. DC 5V 1A over USB.

I could not find a manual or configuration sheet for this exact model. What follows is a test procedure rather than a specification.

### Test it before writing any code against it

Open Notepad and run these in order:

| # | Test | What it tells you |
|---|---|---|
| 1 | Scan any barcode | Characters appear → HID keyboard mode confirmed |
| 2 | Watch the cursor after the scan | Moves to a new line → Enter suffix present. Stays put → set `terminator: 'None'` and rely on G3 idle flush |
| 3 | Switch Windows input to **Arabic**, scan a barcode containing letters | Arabic characters appear → layout dependency confirmed, and G1 is doing real work |
| 4 | Scan the same barcode ten times fast | Duplicates or dropped scans → adjust `debounceMs` |
| 5 | Scan a barcode, then type the same characters by hand | Both should reach the app identically after the guards |

Then run **Settings → Hardware → Test scanner** and read the median interval. Under 20ms is comfortable. Approaching 35ms means the timing heuristic is unsafe.

### Configuration

Ask the seller for the configuration sheet before doing anything else. Generic scanners in this class usually support prefix/suffix programming, inter-character delay, and sometimes ALT-numpad emission (which is layout-independent at the hardware level).

If you find a sheet: program an **F9 prefix** and an **Enter suffix**, then set `prefixCode: 'F9'` in the app. Detection becomes exact.

If you cannot find one: **run in timing mode**. That is what the guards exist for.

```ts
useBarcodeScanner(handleScan, {
  config: {
    prefixCode: null,        // no manual available — timing mode
    terminator: 'Enter',     // confirm with test 2
    maxIntervalMs: 35,
    minLength: 4,
    debounceMs: 300,
  },
  onGuard: (guard, detail) => logger.warn(`[scanner:${guard}] ${detail}`),
});
```

Do not scan configuration barcodes from a manual for a different model hoping they work. They sometimes do and sometimes leave the scanner in a mode you cannot undo. If you try anyway, **print the "restore factory defaults" barcode first and keep it taped to the counter.**

### Two limitations to plan around

**1D only.** Fine for EAN-13 on pharmacy stock, which is what matters today. But it cannot read QR or DataMatrix. If ETA e-invoicing becomes applicable, or if 2D DataMatrix drug serialization arrives the way it has elsewhere, this scanner will not read them. Not urgent. Worth knowing before you buy the next one.

**Physical condition.** The one in the photo is held together with tape. Keep a spare in the drawer — a dead scanner stops the counter completely, and the replacement cost is trivial next to an afternoon of lost sales. When you buy it, pick a model whose manual you can actually download, and pay the small premium for a 2D imager.
