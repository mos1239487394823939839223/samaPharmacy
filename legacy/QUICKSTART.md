# Quick Start Guide

## Installation

1. **Clone and install dependencies:**
   ```bash
   cd /Users/mostafaanwer/Desktop/Projects/samaPharmacy
   npm install
   ```

2. **Install additional dependencies:**
   ```bash
   npm install better-sqlite3
   npm install --save-dev electron-builder
   ```

## Development

### Start Development Server

```bash
npm run dev
```

This will:
- Start Electron in development mode
- Open DevTools automatically
- Watch for file changes (requires a bundler like Vite or webpack — set up separately)

### Build TypeScript

```bash
npm run type-check
```

## Hardware Setup

### Barcode Scanner

1. **Obtain your scanner model** (e.g., Symbol/Zebra LS2208, Honeywell Voyager)
2. **Program the prefix (one-time setup):**
   - Scan the F9 prefix barcode from your scanner's manual
   - This makes the scanner send F9 before every barcode
3. **Configure in Settings → Hardware → Scanner:**
   - Prefix Code: `F9`
   - Terminator: `Enter`
   - Leave other values at defaults
4. **Test:** Settings → Hardware → Test Scanner → scan any barcode

**If you cannot program the scanner:**
- Leave Prefix Code as `null`
- System will fall back to timing heuristic (less reliable)

### Receipt Printer

#### Option 1: Network Printer (Recommended)

1. **Get printer IP address** (print configuration page)
2. **Test connectivity:**
   ```bash
   ping 192.168.1.50
   ```
3. **Configure in Settings → Hardware → Printer:**
   - Transport: `network`
   - Host: `192.168.1.50` (your printer's IP)
   - Port: `9100`
   - Paper Width: `80` (or `58` if narrow)
4. **Test:** Settings → Hardware → Test Printer

#### Option 2: Windows Shared Printer

1. **Share the printer in Windows:**
   - Right-click printer → Properties → Sharing → Check "Share this printer"
   - Note the share name (e.g., `POS80`)
2. **Configure in Settings:**
   - Transport: `share`
   - Share Name: `POS80`
3. **Test:** Settings → Hardware → Test Printer

### Cash Drawer

The drawer is wired to the printer:

1. **Identify the pin** (usually pin 2, sometimes pin 5)
2. **Configure in Settings:**
   - Drawer Pin: Set to `2`, `5`, or `auto`
   - `auto` pulses both pins (harmless on the unwired one)
3. **Test:** Settings → Hardware → Test Printer (drawer should open after test receipt)

## Daily Operations

### Sales Screen

1. **Scan barcode** or manually enter product code
2. **Product is added to cart** with quantity 1
3. **Adjust quantity** in the cart table if needed
4. **Click "دفع نقداً" (Pay Cash)** or **"دفع آجل" (Credit)**
5. **Receipt prints** automatically (in background — you proceed immediately)
6. **Invoice is saved** to database
7. **Drawer opens** (if cash payment)

### Stock Lookup

1. Go to **المخزون (Inventory)**
2. Scan barcode to see:
   - Current quantity
   - Batch/expiry dates
   - Cost price

### Returns

1. Go to **المرتجعات (Returns)**
2. Scan the **customer's receipt** (the barcode in the receipt footer)
3. Select items to return
4. Process refund
5. Print return invoice

## Troubleshooting

### Scanner Not Working

**Check:** Settings → Hardware → Scanner diagnostics

- **Median interval > 35ms:** Scanner is too slow OR timing heuristic mode. Program with F9 prefix.
- **Arabic contamination > 0:** Layout-dependent read detected. Investigate the code.
- **Watchdog resets > 0:** Scanner never sends terminator. Verify terminator is `Enter` (not Tab or nothing).
- **No scans received:** Check USB connection, verify scanner is in HID keyboard mode.

### Printer Not Printing

**Check:** Settings → Hardware → Printer test

1. **"Printer unreachable":** 
   - Verify host IP (`ping 192.168.1.50`)
   - Check port (usually 9100)
   - Confirm network connectivity

2. **"Paper out":**
   - Reload paper
   - Test again

3. **Printed but garbled/blank:**
   - Check Arabic font is bundled (Settings → Hardware → "Bundled Arabic font did not load")
   - Run Test Printer again
   - Verify text is joined and right-aligned

4. **Print job stuck in queue:**
   - Wait 2–5 seconds (automatic retry)
   - If still stuck: Restart app (queue persists but may need manual intervention)

### Database Not Saving

1. **Check disk space** on the data directory
2. **Verify permissions** (`~/Library/Application Support/sama-pharmacy/` on macOS)
3. **Close any external DB viewers** (SQLite GUI tools lock the file)
4. **Restart the app** (queue should replay on startup)

## File Locations

### Configuration & Data

- **Windows:** `%APPDATA%\Roaming\sama-pharmacy\`
- **macOS:** `~/Library/Application Support/sama-pharmacy/`
- **Linux:** `~/.config/sama-pharmacy/`

Files:
- `pharmacy.db` — Main database
- `pharmacy.db-wal`, `pharmacy.db-shm` — SQLite WAL files (delete if corrupted)
- `print-queue.json` — Pending print jobs

### Logs

- **Console:** DevTools → Console tab
- **Main process:** Check terminal where you ran `npm run dev`

## Common Tasks

### Add a New Item to Inventory

Currently manual via database. For GUI:
1. Implement `src/renderer/screens/Inventory.tsx`
2. Add database function in `src/main/database.ts`:
   ```typescript
   export function createItem(item: Omit<Item, 'id'>) { /* ... */ }
   ```
3. Call from renderer via IPC

### Restock Batch

1. **Purchase screen** → scan barcode → enter quantity received
2. Creates new `Batch` record with expiry date
3. Adds to stock for that item

### Run Reports

Currently placeholder. To implement:
1. Add report query functions to `src/main/database.ts`
2. Implement `src/renderer/screens/Reports.tsx`
3. Use a charting library (Recharts recommended)

## Next Steps

1. ✅ Hardware is set up and tested
2. ✅ Sample items are in inventory
3. ✅ Run your first sale
4. 📋 Set up backup routine (copy `pharmacy.db` daily)
5. 🔒 Restrict user access (currently all users have same permissions)
6. 📊 Implement reports (sales, inventory turnover, narcotics)
7. 🌐 Consider multi-till sync for multi-location setup

## Support

For hardware-specific issues, consult:
- [Scanner integration guide](files/hardware-scanner-and-printer.md) — Sections 1.1–1.6
- [Printer integration guide](files/hardware-scanner-and-printer.md) — Sections 2.1–2.8
- [Guard reference](files/hardware-scanner-and-printer.md) — Part 4

For application bugs:
1. Enable verbose logging in DevTools
2. Reproduce the issue
3. Check `ARCHITECTURE.md` guard reference
4. File issue with logs and steps to reproduce
