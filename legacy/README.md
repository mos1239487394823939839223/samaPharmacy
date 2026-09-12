# Sama Pharmacy POS System

A comprehensive pharmacy Point-of-Sale system built with Electron, React, and TypeScript, featuring integrated barcode scanner and receipt printer support.

## Features

- **Sales Management**: Process sales invoices with barcode scanning
- **Purchase Orders**: Manage inventory through purchase invoices
- **Inventory Tracking**: Real-time stock management with batch/expiry date tracking
- **Returns Management**: Handle product returns with proper tracking
- **Hardware Integration**:
  - USB HID Barcode Scanner (layout-independent scanning)
  - ESC/POS Thermal Printer (Arabic support with raster rendering)
  - Cash Drawer Control
- **Multi-language**: Arabic and English support
- **Offline-first**: Database-backed with SQLite

## Project Structure

```
src/
├── main/              # Electron main process
│   ├── index.ts      # App entry point
│   ├── ipc.ts        # IPC communication
│   └── database.ts   # SQLite database
├── renderer/          # React frontend
│   ├── App.tsx       # Main component
│   ├── store.ts      # Zustand state management
│   ├── screens/      # Screen components
│   ├── components/   # Reusable components
│   └── hooks/        # Custom React hooks
├── hardware/         # Hardware drivers
│   ├── scanner.ts    # Barcode scanner
│   └── escpos-printer.ts  # Receipt printer
└── types/           # TypeScript definitions
```

## Key Components

### Scanner (`src/hardware/scanner.ts`)

- **Layout-independent scanning**: Uses `KeyboardEvent.code` instead of `.key` to handle Arabic keyboard layouts
- **Detection modes**:
  - **Prefix mode**: Scanner programmed to emit F9 prefix (exact, reliable)
  - **Timing mode**: Timing heuristic fallback (4+ chars with <35ms gaps)
- **Arabic contamination guard**: Detects and repairs Arabic keyboard interference
- **Auto-debounce**: Prevents duplicate scans within 300ms
- **Diagnostics**: Provides median interval, total scans, and warnings

### Printer (`src/hardware/escpos-printer.ts`)

- **Arabic support**: Renders receipts as 1-bit monochrome rasters via Chromium
- **Multiple transports**:
  - Network (TCP 9100) — preferred
  - Windows share (`\\localhost\ShareName`)
  - File output
- **Cash drawer control**: Supports pin 2 and pin 5 (auto-test both)
- **Print queue**: Persistent, non-blocking with dead-letter handling
- **Guards**:
  - Blank receipt detection
  - Inverted capture detection
  - Oversize receipt prevention
  - Timeout protection
  - Transaction safety

## Installation

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Type check
npm run type-check
```

## Configuration

### Scanner Setup

1. Program your scanner with an F9 prefix (consult your scanner manual)
2. Set terminator to Enter
3. Configure in Settings → Hardware → Scanner

### Printer Setup

1. **Network printer** (recommended):
   - Ensure printer is on network at a known IP
   - Configure Transport: `network`, Host: `192.168.1.50`, Port: `9100`

2. **Windows shared printer**:
   - Share the printer in Windows
   - Configure Transport: `share`, Share Name: `POS80`

3. **Test receipt**:
   - Settings → Hardware → Test Printer
   - Verify Arabic text is properly shaped and right-aligned

## Database

Uses SQLite with WAL mode. Database file stored at:
- Windows: `%APPDATA%\Roaming\sama-pharmacy\pharmacy.db`
- macOS: `~/Library/Application Support/sama-pharmacy/pharmacy.db`
- Linux: `~/.config/sama-pharmacy/pharmacy.db`

## Development Notes

### Adding new screens

1. Create `src/renderer/screens/YourScreen.tsx`
2. Add to `currentScreen` type in `useAppStore`
3. Add menu item in `Layout.tsx`
4. Handle in `App.tsx` render

### Hardware diagnostics

Available in Settings → Hardware:
- **Scanner**: Total scans, mode, median interval, Arabic contamination counter
- **Printer**: Paper status, connection status, test receipt

### Hardware guards

Each guard is documented in the hardware files:
- **Scanner**: G1–G5 (Arabic contamination, prefix watchdog, idle flush, IME/repeat, diagnostics)
- **Printer**: P1–P10 (blank/inverted detection, dimension limits, font verify, timeout, status probe, drawer pin, attempt cap, queue persistence, transaction safety, ASCII fallback)

## Performance

- Receipt printing (raster): 1–2 seconds per 80mm receipt
- Barcode scanning (prefix mode): < 100ms
- Timing mode detection: ~10ms overhead

## License

Proprietary — Sama Pharmacy
