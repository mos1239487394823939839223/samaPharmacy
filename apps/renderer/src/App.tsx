/**
 * Application shell — blueprint §1.1 and §3 screen 1.
 *
 * Toolbar, drawer and the shortcut layer. Every module routes to a placeholder
 * until its own milestone builds it. The keyboard model is deliberately built
 * first: rule 12 says no POS interaction may require the mouse, and that is far
 * cheaper to honour from the start than to retrofit.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { PageProvider } from './lib/workspace';
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
import { StockAdjustmentsScreen } from './modules/stock/StockAdjustmentsScreen';
import { BackupScreen } from './modules/settings/BackupScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MODULES, SCREEN_LABELS, type ScreenId } from './lib/navigation';
import { AuditScreen } from './modules/audit/AuditScreen';
import { NarcoticsScreen } from './modules/narcotics/NarcoticsScreen';
import { PrinterSettingsScreen } from './modules/settings/PrinterSettingsScreen';
import { InvoiceHistoryScreen } from './modules/sales/InvoiceHistoryScreen';
import { PriceFixScreen } from './modules/items/PriceFixScreen';
import { InsuranceScreen } from './modules/insurance/InsuranceScreen';
import { useToast } from './components/Toast';
import { errorText } from './lib/errors';
import { encodeAppError } from '@pharmacy/shared';
import { attachShortcuts, type ShortcutBinding } from './lib/shortcuts';
import { ToastProvider } from './components/Toast';
import { ar } from './i18n/ar';
import { useMediaQuery } from './lib/useMediaQuery';

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
/** Below this width the menu becomes a slide-over panel. */
const COMPACT_QUERY = '(max-width: 1100px)';

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

/** Printer faults surface as toasts wherever the user is (the sale is already safe). */
function PrinterNotices() {
  const { showToast } = useToast();
  useEffect(
    () =>
      window.api?.events.onPrinter((e) => {
        if (e.level === 'info') return;
        showToast(errorText(new Error(encodeAppError({ code: e.code, params: {}, message: e.detail ?? '' }))), 'error');
      }),
    [showToast]
  );
  return null;
}

/** The screen component for a page. `query` is the global-search text it opens with. */
function renderScreen(screen: ScreenId, query: string, navigate: (s: ScreenId) => void) {
    return screen === 'dashboard' ? (
              <Dashboard onNavigate={navigate} />
            ) : screen === 'health' ? (
              <HealthCheck />
            ) : screen === 'items.list' ? (
              <ItemsScreen showBadges={SHOW_FORM_SHORTCUT_BADGES} initialQuery={query} />
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
              <CustomersScreen initialQuery={query} />
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
            ) : screen === 'items.adjustments' ? (
              <StockAdjustmentsScreen />
            ) : screen === 'settings.general' ? (
              <SettingsScreen />
            ) : screen === 'settings.backup' ? (
              <BackupScreen />
            ) : screen === 'settings.printer' ? (
              <PrinterSettingsScreen />
            ) : screen === 'settings.audit' ? (
              <AuditScreen />
            ) : screen === 'items.narcotics' ? (
              <NarcoticsScreen />
            ) : screen === 'items.priceFix' ? (
              <PriceFixScreen />
            ) : screen === 'sales.history' ? (
              <InvoiceHistoryScreen />
            ) : screen === 'accounts.insurance' ? (
              <InsuranceScreen />
            ) : (
              <Placeholder screen={screen} />
            );
}

/** One open page in the workspace. */
interface Page {
  id: string;
  screen: ScreenId;
  /** Global-search text the page was opened with (read once, on mount). */
  query: string;
}

const PAGES_KEY = 'ui.openPages';
const MAX_PAGES = 15;
/** Screens that may be open more than once — several invoices at the counter. */
const MULTI_INSTANCE: ScreenId[] = ['sales.invoices'];

let pageSeq = 1;
const newPage = (screen: ScreenId, query = ''): Page => ({ id: `p${pageSeq++}`, screen, query });

function restorePages(): Page[] {
  try {
    const raw = localStorage.getItem(PAGES_KEY);
    const screens = raw ? (JSON.parse(raw) as string[]) : [];
    const valid = screens.filter((s): s is ScreenId => s in SCREEN_LABELS);
    if (valid.length > 0) return valid.slice(0, MAX_PAGES).map((s) => newPage(s));
  } catch {
    /* corrupt or blocked storage — start fresh */
  }
  return [newPage('dashboard')];
}

export function App() {
  const [pages, setPages] = useState<Page[]>(restorePages);
  const [activeId, setActiveId] = useState<string>(() => pages[0]!.id);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(() => readFlag(DRAWER_KEY, true));
  // Small screens (laptops, tablets): the menu slides over the page instead
  // of taking a column, and closes once a page is chosen.
  const compact = useMediaQuery(COMPACT_QUERY);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const menuOpen = compact ? overlayOpen : drawerOpen;
  useEffect(() => setOverlayOpen(false), [compact]);

  const active = pages.find((p) => p.id === activeId) ?? pages[0]!;

  /** Open a screen: focus its page if already open, otherwise open a new page. */
  function navigate(target: ScreenId, opts: { query?: string; newInstance?: boolean } = {}) {
    const existing = !opts.newInstance ? pages.find((p) => p.screen === target) : undefined;
    if (existing && opts.query === undefined) {
      setActiveId(existing.id);
      return;
    }
    // A search result re-opens the page fresh so it starts from the query.
    const page = newPage(target, opts.query ?? '');
    let next = existing ? pages.map((p) => (p.id === existing.id ? page : p)) : [...pages, page];
    if (next.length > MAX_PAGES) {
      // Drop the oldest page with nothing unsaved.
      const victim = next.find((p) => p.id !== page.id && !dirty[p.id]);
      if (victim) next = next.filter((p) => p !== victim);
    }
    setPages(next);
    setActiveId(page.id);
  }

  function closePage(id: string) {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    if (dirty[id] && !window.confirm(ar.workspace.confirmCloseDirty.replace('{page}', pageLabel(page)))) return;
    const index = pages.findIndex((p) => p.id === id);
    const remaining = pages.filter((p) => p.id !== id);
    const next = remaining.length > 0 ? remaining : [newPage('dashboard')];
    setPages(next);
    setDirty((d) => {
      const { [id]: _gone, ...rest } = d;
      return rest;
    });
    if (id === activeId) setActiveId((next[Math.min(index, next.length - 1)] ?? next[0]!).id);
  }

  function cycle(step: number) {
    const i = pages.findIndex((p) => p.id === activeId);
    const target = pages[(i + step + pages.length) % pages.length];
    if (target) setActiveId(target.id);
  }

  /** "فواتير المبيعات (2)" when a screen is open more than once. */
  function pageLabel(page: Page): string {
    const same = pages.filter((p) => p.screen === page.screen);
    const label = SCREEN_LABELS[page.screen];
    return same.length > 1 ? `${label} (${same.indexOf(page) + 1})` : label;
  }

  useEffect(() => {
    try {
      localStorage.setItem(DRAWER_KEY, String(drawerOpen));
    } catch {
      /* private mode or blocked storage — the toggle still works this session */
    }
  }, [drawerOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(PAGES_KEY, JSON.stringify(pages.map((p) => p.screen)));
    } catch {
      /* not remembered across restarts — still works this session */
    }
  }, [pages]);

  // Latest handlers for the document-level shortcuts below.
  const actions = useRef({ navigate, closePage, cycle, activeId });
  actions.current = { navigate, closePage, cycle, activeId };

  const bindings = useMemo<ShortcutBinding[]>(
    () => [
      ...MODULES.map((m) => ({
        id: m.id,
        ...m.shortcut,
        run: () => actions.current.navigate(m.target),
      })),
      { id: 'closePage', code: 'KeyW', ctrl: true, run: () => actions.current.closePage(actions.current.activeId) },
      { id: 'nextPage', code: 'Tab', ctrl: true, run: () => actions.current.cycle(1) },
      { id: 'prevPage', code: 'Tab', ctrl: true, shift: true, run: () => actions.current.cycle(-1) },
    ],
    []
  );

  useEffect(() => attachShortcuts(bindings), [bindings]);

  const setDirtyFor = useMemo(() => {
    const cache = new Map<string, (d: boolean) => void>();
    return (id: string) => {
      let fn = cache.get(id);
      if (!fn) {
        fn = (d: boolean) => setDirty((prev) => (Boolean(prev[id]) === d ? prev : { ...prev, [id]: d }));
        cache.set(id, fn);
      }
      return fn;
    };
  }, []);

  return (
    <ToastProvider>
      <PrinterNotices />
      <div className="shell">
        <Toolbar
          activeScreen={active.screen}
          onNavigate={(s) => navigate(s)}
          onToggleDrawer={() => (compact ? setOverlayOpen((v) => !v) : setDrawerOpen((v) => !v))}
          onSearchNavigate={(s, q) => navigate(s, { query: q })}
        />

        <div className="shell__body">
          {compact && overlayOpen && <div className="drawer-backdrop" onClick={() => setOverlayOpen(false)} aria-hidden="true" />}
          <Drawer
            open={menuOpen}
            overlay={compact}
            activeScreen={active.screen}
            onNavigate={(s) => {
              navigate(s);
              setOverlayOpen(false);
            }}
            pages={pages.map((p) => ({ id: p.id, screen: p.screen, label: pageLabel(p), dirty: Boolean(dirty[p.id]) }))}
            activePageId={active.id}
            onSelectPage={(id) => {
              setActiveId(id);
              setOverlayOpen(false);
            }}
            onClosePage={closePage}
            onNewSale={() => {
              navigate('sales.invoices', { newInstance: true });
              setOverlayOpen(false);
            }}
          />

          {pages.map((page) => (
            // Every open page stays mounted; only the active one is shown.
            <main className="shell__content" key={page.id} hidden={page.id !== active.id}>
              <PageProvider value={{ active: page.id === active.id, setDirty: setDirtyFor(page.id) }}>
                <ErrorBoundary>
                  <h1 className="shell__heading">{pageLabel(page)}</h1>
                  {renderScreen(page.screen, page.query, (s) => navigate(s))}
                </ErrorBoundary>
              </PageProvider>
            </main>
          ))}
        </div>
      </div>
    </ToastProvider>
  );
}
