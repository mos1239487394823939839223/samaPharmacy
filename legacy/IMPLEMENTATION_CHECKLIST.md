# Implementation Checklist

This checklist tracks the current state of the pharmacy system and what remains to be done.

## ✅ Completed

### Core Infrastructure
- [x] Project structure (src/main, src/renderer, src/hardware)
- [x] TypeScript configuration
- [x] Package.json with dependencies
- [x] Electron main process setup
- [x] React renderer setup
- [x] IPC bridge with context isolation
- [x] Preload script for secure API exposure

### Hardware Integration
- [x] Scanner driver (`src/hardware/scanner.ts`)
  - [x] Layout-independent scanning (event.code)
  - [x] Prefix mode detection
  - [x] Timing mode heuristic
  - [x] Arabic contamination guard (G1–G5)
  - [x] React hook (`useBarcodeScanner`)
- [x] Printer driver (`src/hardware/escpos-printer.ts`)
  - [x] Multiple transports (network, share, file)
  - [x] Arabic raster rendering
  - [x] Cash drawer control
  - [x] Print queue with persistence
  - [x] All guards (P1–P10)

### Database
- [x] SQLite schema (items, barcodes, batches, invoices, customers, users)
- [x] Database initialization
- [x] Basic query functions (getItem, getItemByBarcode, createInvoice)

### State Management
- [x] Zustand store (`src/renderer/store.ts`)
  - [x] UI state (currentScreen, sidebarOpen, darkMode)
  - [x] Cart management
  - [x] Collections (items, invoices, customers)
  - [x] Settings

### UI Components
- [x] Layout component (sidebar, header)
- [x] Sales screen (barcode scanning, cart, checkout)
- [x] Settings screen (hardware config & diagnostics)

### Documentation
- [x] README.md (project overview)
- [x] QUICKSTART.md (getting started guide)
- [x] ARCHITECTURE.md (system design)
- [x] PROJECT_STRUCTURE.txt (file organization)

## 🚧 Partial/In-Progress

### Screens
- [ ] Sales screen — Cart UI needs refinement
  - [x] Basic layout
  - [ ] Quantity adjustments
  - [ ] Payment processing
  - [ ] Discount handling
  - [ ] Invoice finalization
- [ ] Inventory screen
  - [ ] Item list view
  - [ ] Batch/expiry tracking
  - [ ] Stock-out alerts
  - [ ] Search/filter
- [ ] Purchase screen
  - [ ] Supplier management
  - [ ] PO creation
  - [ ] Stock receipt
- [ ] Returns screen
  - [ ] Receipt barcode scanning
  - [ ] Return item selection
  - [ ] Refund processing
- [ ] Reports screen
  - [ ] Daily sales report
  - [ ] Inventory turnover
  - [ ] Expiry upcoming alerts

### Database
- [x] Schema definition
- [x] Item lookup
- [ ] Full CRUD operations for all entities
- [ ] Batch/FEFO logic
- [ ] Stock quantity updates
- [ ] Customer credit tracking
- [ ] User roles & permissions
- [ ] Audit logging

### Hardware Integration
- [x] Scanner driver code
- [x] Printer driver code
- [ ] Network printer discovery
- [ ] Printer font bundling (Arabic TTF)
- [ ] Receipt template customization
- [ ] Auto-print settings

## ❌ Not Started

### Advanced Features
- [ ] Multi-till synchronization
- [ ] Narcotics register (controlled substances)
- [ ] Loyalty program
- [ ] Supplier EDI integration
- [ ] Mobile companion app
- [ ] Cloud backup
- [ ] Multi-location support
- [ ] User authentication & roles
- [ ] Audit trail
- [ ] Barcode generation/printing
- [ ] Label printing

### Performance & Reliability
- [ ] Error tracking (Sentry)
- [ ] Analytics
- [ ] Crash reporting
- [ ] Auto-updates
- [ ] Backup automation
- [ ] Data migration tools
- [ ] Import/export tools

### Testing
- [ ] Unit tests (Jest)
- [ ] Component tests (React Testing Library)
- [ ] E2E tests (Cypress/Playwright)
- [ ] Hardware integration tests

## 📋 Immediate Next Steps

### Week 1: Core Features
1. **Implement payment processing** (src/renderer/screens/Sales.tsx)
   - Confirm cash payment → create invoice
   - Confirm credit payment → update customer credit
   - Print receipt via IPC

2. **Enhance database** (src/main/database.ts)
   - Add updateCartLine (adjust quantities)
   - Add finalizeInvoice (commit to DB)
   - Add updateStock (subtract from batches)
   - Add getCustomer, updateCustomerCredit

3. **Wire up Settings screen** (src/renderer/screens/Settings.tsx)
   - Load saved settings from electron-store
   - Persist changes
   - Test printer/scanner from UI

### Week 2: Inventory & Reports
1. **Build Inventory screen**
   - List all items with current stock
   - Search/filter by name or barcode
   - Show batch/expiry details
   - Alert on stock-out

2. **Build Reports screen**
   - Daily sales summary (count, revenue)
   - Top items by quantity
   - Upcoming expirations

### Week 3: Purchase & Returns
1. **Build Purchase screen**
   - Create purchase orders
   - Receive stock (batch creation)
   - Update inventory

2. **Build Returns screen**
   - Scan receipt barcode → lookup original invoice
   - Select items to return
   - Process refund

### Week 4: Polish & Deployment
1. Error handling & user feedback
2. Keyboard shortcuts (Alt+P for Print, etc.)
3. Offline handling (queue jobs while offline)
4. Test on actual hardware
5. Package & distribute

## 🔧 Implementation Notes

### Adding a New Screen

```typescript
// 1. Create screen component
// src/renderer/screens/MyScreen.tsx
import React from 'react';

export const MyScreen: React.FC = () => {
  return <div dir="rtl">My Screen</div>;
};

// 2. Add to AppState type
// src/renderer/store.ts
currentScreen: 'sales' | 'purchase' | 'inventory' | 'returns' | 'reports' | 'settings' | 'myscreen';

// 3. Add menu item
// src/renderer/components/Layout.tsx
const screens = [
  // ... existing
  { id: 'myscreen', label: 'شاشتي', icon: '⭐' },
];

// 4. Add to render
// src/renderer/App.tsx
case 'myscreen':
  return <MyScreen />;
```

### Adding a Database Function

```typescript
// src/main/database.ts
export function myQuery(param: string): ResultType {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare('SELECT * FROM table WHERE column = ?');
  return stmt.get(param) as ResultType;
}

// Expose via IPC
// src/main/ipc.ts
ipcMain.handle('db:myQuery', async (_, param: string) => {
  return myQuery(param);
});

// Call from renderer
// any component
const result = await window.electronAPI.db.myQuery('value');
```

### Hardware Testing

- **Scanner:** Settings → Hardware → "Test Scanner" button
- **Printer:** Settings → Hardware → "Test Printer" button
- **Drawer:** Settings → Hardware → "Test Drawer" button

## 📦 Deployment

1. **Build:**
   ```bash
   npm run build
   npm run type-check
   ```

2. **Package (requires electron-builder setup):**
   ```bash
   electron-builder
   ```

3. **Distribution:**
   - GitHub releases
   - Custom update server
   - Direct download (manual)

## 🐛 Known Issues / Limitations

1. **No persistence of settings to disk** — currently Zustand store only
2. **No user authentication** — anyone can access the system
3. **No audit logging** — changes not tracked
4. **No invoice reprinting** — only prints once
5. **No backup mechanism** — database can be lost
6. **Scanner timing mode fragile** — prefer prefix mode
7. **No printer driver auto-detection** — manual IP/share config

## 🎯 Success Criteria

- [ ] First sale completes end-to-end (scan → checkout → print)
- [ ] Receipt prints correctly (Arabic text, joined, right-aligned)
- [ ] Hardware diagnostics visible in Settings
- [ ] Invoices persisted to database
- [ ] Scanner and printer tests pass
- [ ] All guards active & non-zero counts visible
