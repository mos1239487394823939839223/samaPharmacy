/**
 * Application shell — blueprint §1.1 and §3 screen 1.
 *
 * Toolbar, drawer and the shortcut layer. Every module routes to a placeholder
 * until its own milestone builds it. The keyboard model is deliberately built
 * first: rule 12 says no POS interaction may require the mouse, and that is far
 * cheaper to honour from the start than to retrofit.
 */

import { useEffect, useMemo, useState } from 'react';
import type { RendererApi } from '@pharmacy/shared';
import { Toolbar } from './components/Toolbar';
import { Drawer } from './components/Drawer';
import { Placeholder } from './components/Placeholder';
import { HealthCheck } from './components/HealthCheck';
import { Dashboard } from './components/Dashboard';
import { ItemsScreen } from './modules/items/ItemsScreen';
import { WarehousesScreen } from './modules/warehouses/WarehousesScreen';
import { SuppliersScreen } from './modules/suppliers/SuppliersScreen';
import { PurchasesScreen } from './modules/purchases/PurchasesScreen';
import { StockScreen } from './modules/stock/StockScreen';
import { SalesScreen } from './modules/sales/SalesScreen';
import { ShiftHandoverScreen } from './modules/shifts/ShiftHandoverScreen';
import { CustomersScreen } from './modules/customers/CustomersScreen';
import { CustomerReportsScreen } from './modules/customers/CustomerReportsScreen';
import { SalesReturnByInvoiceScreen } from './modules/sales-returns/SalesReturnByInvoiceScreen';
import { SalesReturnGeneralScreen } from './modules/sales-returns/SalesReturnGeneralScreen';
import { PurchaseReturnByInvoiceScreen } from './modules/purchase-returns/PurchaseReturnByInvoiceScreen';
import { PurchaseReturnGeneralScreen } from './modules/purchase-returns/PurchaseReturnGeneralScreen';
import { CashInOutScreen } from './modules/cash/CashInOutScreen';
import { SettingsScreen } from './modules/settings/SettingsScreen';
import { SalesReportScreen } from './modules/sales-report/SalesReportScreen';
import { ExpiryReportScreen } from './modules/stock/ExpiryReportScreen';
import { MODULES, SCREEN_LABELS, type ScreenId } from './lib/navigation';
import { attachShortcuts, type ShortcutBinding } from './lib/shortcuts';
import { ToastProvider } from './components/Toast';

declare global {
  interface Window {
    /**
     * Injected by the preload script, so it is present only inside Electron.
     * Optional on purpose: opening the Vite dev URL in a browser leaves it
     * undefined, and the type should force callers to handle that.
     */
    api?: RendererApi;
  }
}

const DRAWER_KEY = 'ui.drawerOpen';

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

// Shortcut-key badges on the item form's save/cancel buttons (e.g. "Ctrl+Shift+S")
// — always shown; this is unrelated to sidebar navigation.
const SHOW_FORM_SHORTCUT_BADGES = true;

export function App() {
  const [screen, setScreen] = useState<ScreenId>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(() => readFlag(DRAWER_KEY, true));

  useEffect(() => {
    try {
      localStorage.setItem(DRAWER_KEY, String(drawerOpen));
    } catch {
      /* private mode or blocked storage — the toggle still works this session */
    }
  }, [drawerOpen]);

  const bindings = useMemo<ShortcutBinding[]>(
    () =>
      MODULES.map((m) => ({
        id: m.id,
        ...m.shortcut,
        run: () => setScreen(m.target),
      })),
    []
  );

  useEffect(() => attachShortcuts(bindings), [bindings]);

  return (
    <ToastProvider>
      <div className="shell">
        <Toolbar activeScreen={screen} onNavigate={setScreen} onToggleDrawer={() => setDrawerOpen((v) => !v)} />

        <div className="shell__body">
          <Drawer open={drawerOpen} activeScreen={screen} onNavigate={setScreen} />

          <main className="shell__content">
            <h1 className="shell__heading">{SCREEN_LABELS[screen]}</h1>
            {screen === 'dashboard' ? (
              <Dashboard onNavigate={setScreen} />
            ) : screen === 'health' ? (
              <HealthCheck />
            ) : screen === 'items.list' ? (
              <ItemsScreen showBadges={SHOW_FORM_SHORTCUT_BADGES} />
            ) : screen === 'warehouses' ? (
              <WarehousesScreen />
            ) : screen === 'suppliers.list' ? (
              <SuppliersScreen />
            ) : screen === 'purchases.invoices' ? (
              <PurchasesScreen />
            ) : screen === 'items.stock' ? (
              <StockScreen />
            ) : screen === 'sales.invoices' ? (
              <SalesScreen />
            ) : screen === 'sales.shiftHandover' ? (
              <ShiftHandoverScreen />
            ) : screen === 'customers.list' ? (
              <CustomersScreen />
            ) : screen === 'customers.reports' ? (
              <CustomerReportsScreen />
            ) : screen === 'sales.returnByInvoice' ? (
              <SalesReturnByInvoiceScreen />
            ) : screen === 'sales.returnGeneral' ? (
              <SalesReturnGeneralScreen />
            ) : screen === 'purchases.returnByInvoice' ? (
              <PurchaseReturnByInvoiceScreen />
            ) : screen === 'purchases.returnGeneral' ? (
              <PurchaseReturnGeneralScreen />
            ) : screen === 'accounts.cashInOut' ? (
              <CashInOutScreen />
            ) : screen === 'sales.reports' ? (
              <SalesReportScreen />
            ) : screen === 'items.expiry' ? (
              <ExpiryReportScreen />
            ) : screen === 'settings.general' ? (
              <SettingsScreen />
            ) : (
              <Placeholder screen={screen} />
            )}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
