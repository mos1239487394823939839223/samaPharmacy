# Sama Pharmacy — Architecture Overview

## System Design

This is a desktop POS (Point-of-Sale) system for pharmacy management, built with Electron for cross-platform support. The architecture separates concerns across three layers:

### 1. Main Process (Electron)

Handles:
- Application lifecycle and window management (`src/main/index.ts`)
- Hardware integration (printer via IPC)
- Database operations (`src/main/database.ts`)
- IPC handlers for renderer communication (`src/main/ipc.ts`)

**Key files:**
- `src/main/index.ts` — entry point, window creation, printer init
- `src/main/database.ts` — SQLite database operations
- `src/main/ipc.ts` — IPC handlers for renderer→main communication

### 2. Renderer Process (React + TypeScript)

The UI layer running in the BrowserWindow:
- React components with hooks (`src/renderer/`)
- Zustand state management (`src/renderer/store.ts`)
- Screen implementations (`src/renderer/screens/`)
- Reusable UI components (`src/renderer/components/`)

**Key files:**
- `src/renderer/App.tsx` — main component with screen routing
- `src/renderer/store.ts` — global state (items, invoices, settings, etc.)
- `src/renderer/screens/Sales.tsx` — primary POS screen
- `src/renderer/screens/Settings.tsx` — hardware config

### 3. Hardware Drivers (Shared)

Located in `src/hardware/`, these modules run in the main process but are used by the renderer via IPC:

#### Scanner (`src/hardware/scanner.ts`)

**Problem:** USB HID barcode scanners act as keyboards. With Windows Arabic layout enabled, `KeyboardEvent.key` returns Arabic letters, breaking lookups (`PH4501A` → `صح4501ش`).

**Solution:**
- Read `KeyboardEvent.code` (physical key position) instead of `.key`
- Map codes to characters independently
- Detection modes: prefix (F9 programmed on scanner) or timing heuristic
- Arabic contamination guard catches and repairs layout-dependent scans

**Usage (renderer):**
```typescript
import { useBarcodeScanner } from '@/hardware/scanner';

function MyComponent() {
  useBarcodeScanner(
    (event) => { /* event.code is the barcode */ },
    {
      config: settings.hardware.scanner,
      onGuard: (guard, detail) => console.warn(detail),
    }
  );
}
```

#### Printer (`src/hardware/escpos-printer.ts`)

**Problem:** ESC/POS thermal printers have no Arabic contextual letter shaping or RTL support, even with CP864/CP1256.

**Solution:**
- Render receipt HTML in a hidden BrowserWindow (Chromium does the shaping)
- Capture as image, convert to 1-bit monochrome, send via `GS v 0` raster command
- Multiple transports: network (TCP 9100, preferred), Windows share, file
- Print queue is persistent, non-blocking, and crash-safe

**Usage (main process via IPC):**
```typescript
// In renderer
await window.electronAPI.printer.printReceipt({
  pharmacyName: 'Sama Pharmacy',
  lines: [...],
  total: 10000, // piastres
  // ...
});
```

## Data Flow

### Sales Invoice Flow

1. **Barcode scanned** → scanner.ts emits `ScanEvent`
2. **Hook captures scan** → `useScannerSetup` in renderer
3. **Item lookup** → query from store or database
4. **Add to cart** → Zustand action updates `currentCart`
5. **User confirms payment** → create `Invoice` record
6. **Main process** → `createInvoice()` commits to database
7. **Print queued** → IPC to printer service, non-blocking
8. **Receipt prints** → user already on next invoice

### Key Guard Points

**Scanner:**
- G1: Arabic character contamination detected and repaired (flag for investigation)
- G2: Prefix capture watchdog — release keyboard if scanner never sends terminator
- G3: Idle flush — scanners with no terminator
- G4: IME and auto-repeat suppression
- G5: Diagnostics visible in Settings (median interval, contamination counter)

**Printer:**
- P1: Blank or inverted capture detection
- P2: Oversize receipt prevention (4000-row limit)
- P3: Arabic font verification at render time
- P4: Rasterise timeout (15s) with single-flight lock
- P5: Paper-out probe (network transport only)
- P6: Drawer pin fallback (auto-test both pin 2 and 5)
- P7: Attempt cap (5 max) with dead-letter queue
- P8: Atomic queue persistence (temp file + rename)
- P9: Transaction safety — refuse to print inside open DB tx
- P10: ASCII fallback receipt on repeated raster failures

## State Management

### Zustand Store (`src/renderer/store.ts`)

Single source of truth:
```typescript
interface AppState {
  currentScreen: 'sales' | 'purchase' | 'inventory' | 'returns' | 'settings' | 'reports';
  currentCart: Invoice['lines'][];
  items: Item[];
  invoices: Invoice[];
  settings: AppSettings;
  // ...
  addToCart, removeFromCart, updateCartLine, clearCart;
  // ...
}
```

All screen components subscribe to relevant slices via hooks:
```typescript
const { currentCart, addToCart } = useAppStore((s) => ({
  currentCart: s.currentCart,
  addToCart: s.addToCart,
}));
```

## Database Schema

SQLite, WAL mode, at `~/.config/sama-pharmacy/pharmacy.db`:

- **items** — product master (id, name, nameAr, category)
- **barcodes** — multiple barcodes per item
- **batches** — stock by batch/expiry (itemId, expiryDate, quantity, costPrice)
- **invoices** — sales/purchase records (serial, type, total, status)
- **invoiceLines** — line items with batch reference
- **customers** — credit customer records (creditLimit, outstanding)
- **users** — staff accounts (role: admin|cashier|pharmacist|manager)

## Configuration

### Settings Structure

```typescript
interface AppSettings {
  pharmacyName: string;
  pharmacyNameAr: string;
  address: string;
  phone: string;
  hardware: {
    scanner: ScannerConfig;  // prefix, terminator, timing params
    printer: PrinterConfig;  // transport, host, port, paper width, drawer pin
  };
  currency: 'EGP' | 'USD';
  language: 'ar' | 'en';
}
```

Stored in Zustand and persisted via electron-store on app quit.

## IPC Bridge

Context isolation enforced. Preload script exposes safe API:

```typescript
// In renderer (safe)
window.electronAPI.printer.printReceipt(data);
window.electronAPI.printer.openDrawer(pin);
window.electronAPI.printer.test();

// Main process handles
ipcMain.handle('printer:receipt', async (_, data) => { /* ... */ });
```

## Performance Targets

- **Barcode scan detection**: <100ms (prefix mode)
- **Receipt print start-to-finish**: 1–2s (raster rendering + network)
- **Database query (by barcode)**: <5ms
- **Screen transition**: <200ms
- **Printer queue drain**: continuous, non-blocking

## Testing & Diagnostics

### Scanner Diagnostics (Settings → Hardware)

- Total scans
- Median inter-keystroke interval
- Contamination counter (0 = healthy)
- Watchdog resets (0 = healthy)
- Last scan time
- Warnings (timing margins too tight)

### Printer Diagnostics (Settings → Hardware)

- Connection status
- Paper status (if network transport)
- Dead letter queue (jobs that failed 5 times)
- Test receipt (verifies Arabic shaping)
- Drawer test (pulse both pins so installer can see which fires)

## Future Extensions

- **Multi-till sync** — Firebase or local LAN replication
- **Narcotics register** — audit log with restricted access
- **Loyalty program** — customer point tracking
- **Mobile companion** — React Native for stock lookups
- **EDI integration** — pharmaceutical wholesaler feeds
- **Offline queue** — sync when network returns

## Deployment

1. Run `npm run build` to create distributable
2. `electron-builder` handles installer creation for Windows/macOS/Linux
3. Auto-updates via Electron Update (not configured in this template)
4. Database and print queue persist across app restarts

## Troubleshooting

**Scanner not detecting:**
- Verify Scanner → Hardware diagnostics (median interval > 35ms = timing heuristic struggling)
- Check prefix is programmed (F9 recommended)
- Look for Arabic contamination counter > 0

**Printer not printing:**
- Settings → Hardware → Test Printer button
- Check paper status (Paper tab shows "Paper out" = reload paper)
- Check network connectivity (ping host)
- Look at printer event log for timeouts or render errors

**Invoice not saving:**
- Check database is not corrupted (`pharmacy.db` and `.db-wal` should exist)
- Confirm no transaction guard violations (P9 log)
- Check disk space (queue persistence needs write access)
