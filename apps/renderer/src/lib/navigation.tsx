/**
 * Navigation model — blueprint §1.1.
 *
 * Six toolbar modules with global shortcuts, plus the drawer tree. Screen ids
 * are stable strings; each maps to a placeholder until its milestone builds it.
 */

import type { ReactNode } from 'react';
import type { Shortcut } from './shortcuts';
import { ar } from '../i18n/ar';
import {
  AlertIcon,
  ArrowsIcon,
  BoxIcon,
  BuildingIcon,
  CalendarIcon,
  CartIcon,
  ChartIcon,
  ClipboardIcon,
  ClockIcon,
  CoinsIcon,
  DatabaseIcon,
  FileTextIcon,
  HistoryIcon,
  LayersIcon,
  ListIcon,
  PrinterIcon,
  ReceiptIcon,
  RedoIcon,
  SettingsIcon,
  ShieldIcon,
  TagIcon,
  TruckIcon,
  UndoIcon,
  UsersIcon,
  WalletIcon,
  HomeIcon,
} from '../components/icons';

export type ScreenId =
  | 'dashboard'
  | 'sales.invoices'
  | 'sales.shiftHandover'
  | 'sales.returnByInvoice'
  | 'sales.returnGeneral'
  | 'sales.reports'
  | 'purchases.invoices'
  | 'purchases.returnByInvoice'
  | 'purchases.returnGeneral'
  | 'suppliers.list'
  | 'items.list'
  | 'items.ibnSina'
  | 'items.stock'
  | 'items.expiry'
  | 'items.adjustments'
  | 'items.narcotics'
  | 'items.priceFix'
  | 'items.shortages'
  | 'items.valuation'
  | 'items.opening'
  | 'items.edit'
  | 'sales.history'
  | 'accounts.insurance'
  | 'settings.backup'
  | 'settings.printer'
  | 'settings.audit'
  | 'customers.list'
  | 'customers.reports'
  | 'warehouses'
  | 'accounts.cashInOut'
  | 'settings.general'
  | 'log'
  | 'health';

export interface ModuleDef {
  id: string;
  label: string;
  shortcut: Shortcut;
  /** Screen opened when the toolbar button is activated. */
  target: ScreenId;
}

/**
 * Ctrl+Shift+N, Ctrl+Shift+T and Ctrl+N collide with Chromium defaults
 * (new incognito window, reopen closed tab, new window). The default
 * application menu is cleared in main so these reach the app — blueprint §2.7.
 */
export const MODULES: ModuleDef[] = [
  {
    id: 'sales',
    label: ar.modules.sales,
    shortcut: { code: 'KeyN', ctrl: true, shift: true },
    target: 'sales.invoices',
  },
  {
    id: 'returns',
    label: ar.modules.returns,
    shortcut: { code: 'KeyU', ctrl: true, shift: true },
    target: 'sales.returnByInvoice',
  },
  {
    id: 'purchases',
    label: ar.modules.purchases,
    shortcut: { code: 'KeyP', ctrl: true, shift: true },
    target: 'purchases.invoices',
  },
  {
    id: 'items',
    label: ar.modules.items,
    shortcut: { code: 'KeyT', ctrl: true, shift: true },
    target: 'items.list',
  },
  {
    id: 'customers',
    label: ar.modules.customers,
    shortcut: { code: 'KeyC', ctrl: true, shift: true },
    target: 'customers.list',
  },
  {
    id: 'log',
    label: ar.modules.log,
    shortcut: { code: 'KeyH', ctrl: true },
    target: 'sales.history',
  },
];

export type Tone = 'home' | 'sales' | 'stock' | 'purchases' | 'customers' | 'reports' | 'settings';

export interface DrawerNode {
  label: string;
  screen?: ScreenId;
  icon?: ReactNode;
  /** Section colour (groups only): sales, stock, purchases, customers, reports, settings. */
  tone?: Tone;
  children?: DrawerNode[];
}

/**
 * The menu, grouped by the job being done — the till first, since that is
 * where the day is spent. Every screen appears once, under one clear name
 * (the same name its page tab shows).
 */
export const DRAWER_TREE: DrawerNode[] = [
  {
    label: ar.drawer.groupSales,
    tone: 'sales',
    icon: <ReceiptIcon className="icon--sm" />,
    children: [
      { label: ar.drawer.salesInvoices, screen: 'sales.invoices', icon: <CartIcon className="icon--sm" /> },
      { label: ar.drawer.salesHistory, screen: 'sales.history', icon: <HistoryIcon className="icon--sm" /> },
      { label: ar.drawer.salesReturnByInvoice, screen: 'sales.returnByInvoice', icon: <UndoIcon className="icon--sm" /> },
      { label: ar.drawer.salesReturnGeneral, screen: 'sales.returnGeneral', icon: <UndoIcon className="icon--sm" /> },
      { label: ar.drawer.salesShiftHandover, screen: 'sales.shiftHandover', icon: <ClockIcon className="icon--sm" /> },
      { label: ar.drawer.cashInOut, screen: 'accounts.cashInOut', icon: <ArrowsIcon className="icon--sm" /> },
    ],
  },
  {
    label: ar.drawer.groupStock,
    tone: 'stock',
    icon: <BoxIcon className="icon--sm" />,
    children: [
      { label: ar.drawer.itemsList, screen: 'items.list', icon: <ListIcon className="icon--sm" /> },
      { label: ar.drawer.itemsShortages, screen: 'items.shortages', icon: <AlertIcon className="icon--sm" /> },
      { label: ar.drawer.itemsStock, screen: 'items.stock', icon: <LayersIcon className="icon--sm" /> },
      { label: ar.drawer.itemsOpening, screen: 'items.opening', icon: <BoxIcon className="icon--sm" /> },
      { label: ar.drawer.itemsExpiry, screen: 'items.expiry', icon: <CalendarIcon className="icon--sm" /> },
      { label: ar.drawer.itemsAdjustments, screen: 'items.adjustments', icon: <ClipboardIcon className="icon--sm" /> },
      { label: ar.drawer.itemsNarcotics, screen: 'items.narcotics', icon: <ShieldIcon className="icon--sm" /> },
    ],
  },
  {
    label: ar.drawer.groupPurchases,
    tone: 'purchases',
    icon: <TruckIcon className="icon--sm" />,
    children: [
      { label: ar.drawer.purchaseInvoices, screen: 'purchases.invoices', icon: <FileTextIcon className="icon--sm" /> },
      { label: ar.drawer.suppliersList, screen: 'suppliers.list', icon: <TruckIcon className="icon--sm" /> },
      { label: ar.drawer.purchaseReturnByInvoice, screen: 'purchases.returnByInvoice', icon: <RedoIcon className="icon--sm" /> },
      { label: ar.drawer.purchaseReturnGeneral, screen: 'purchases.returnGeneral', icon: <RedoIcon className="icon--sm" /> },
    ],
  },
  {
    label: ar.drawer.groupCustomers,
    tone: 'customers',
    icon: <UsersIcon className="icon--sm" />,
    children: [
      { label: ar.drawer.customersList, screen: 'customers.list', icon: <UsersIcon className="icon--sm" /> },
      { label: ar.drawer.customersReports, screen: 'customers.reports', icon: <WalletIcon className="icon--sm" /> },
      { label: ar.drawer.insurance, screen: 'accounts.insurance', icon: <ShieldIcon className="icon--sm" /> },
    ],
  },
  {
    label: ar.drawer.groupReports,
    tone: 'reports',
    icon: <WalletIcon className="icon--sm" />,
    children: [
      { label: ar.drawer.salesReports, screen: 'sales.reports', icon: <ChartIcon className="icon--sm" /> },
      { label: ar.drawer.itemsValuation, screen: 'items.valuation', icon: <CoinsIcon className="icon--sm" /> },
      { label: ar.drawer.settingsAudit, screen: 'settings.audit', icon: <HistoryIcon className="icon--sm" /> },
    ],
  },
  {
    label: ar.drawer.groupSettings,
    tone: 'settings',
    icon: <SettingsIcon className="icon--sm" />,
    children: [
      { label: ar.drawer.settingsGeneral, screen: 'settings.general', icon: <SettingsIcon className="icon--sm" /> },
      { label: ar.drawer.settingsPrinter, screen: 'settings.printer', icon: <PrinterIcon className="icon--sm" /> },
      { label: ar.drawer.settingsBackup, screen: 'settings.backup', icon: <DatabaseIcon className="icon--sm" /> },
      { label: ar.drawer.warehouses, screen: 'warehouses', icon: <BuildingIcon className="icon--sm" /> },
      { label: ar.drawer.itemsPriceFix, screen: 'items.priceFix', icon: <TagIcon className="icon--sm" /> },
    ],
  },
];

/** Flat lookup of every screen's display label. */
export const SCREEN_LABELS: Record<ScreenId, string> = {
  dashboard: ar.dashboard.title,
  'sales.invoices': ar.drawer.salesInvoices,
  'sales.shiftHandover': ar.drawer.salesShiftHandover,
  'sales.returnByInvoice': ar.drawer.salesReturnByInvoice,
  'sales.returnGeneral': ar.drawer.salesReturnGeneral,
  'sales.reports': ar.drawer.salesReports,
  'purchases.invoices': ar.drawer.purchaseInvoices,
  'purchases.returnByInvoice': ar.drawer.purchaseReturnByInvoice,
  'purchases.returnGeneral': ar.drawer.purchaseReturnGeneral,
  'suppliers.list': ar.drawer.suppliersList,
  'items.stock': ar.drawer.itemsStock,
  'items.list': ar.drawer.itemsList,
  'items.ibnSina': ar.drawer.itemsIbnSina,
  'items.expiry': ar.drawer.itemsExpiry,
  'items.adjustments': ar.drawer.itemsAdjustments,
  'items.narcotics': ar.drawer.itemsNarcotics,
  'items.priceFix': ar.drawer.itemsPriceFix,
  'items.shortages': ar.drawer.itemsShortages,
  'items.valuation': ar.drawer.itemsValuation,
  'items.opening': ar.drawer.itemsOpening,
  'items.edit': ar.items.edit,
  'sales.history': ar.drawer.salesHistory,
  'accounts.insurance': ar.drawer.insurance,
  'settings.backup': ar.drawer.settingsBackup,
  'settings.printer': ar.drawer.settingsPrinter,
  'settings.audit': ar.drawer.settingsAudit,
  'customers.list': ar.drawer.customersList,
  'customers.reports': ar.drawer.customersReports,
  warehouses: ar.drawer.warehouses,
  'accounts.cashInOut': ar.drawer.cashInOut,
  'settings.general': ar.drawer.settingsGeneral,
  log: ar.modules.log,
  health: ar.status.connectionOk,
};


/** The section colour of a screen (its menu group's). */
export function toneOf(screen: ScreenId): Tone {
  if (screen === 'dashboard') return 'home';
  if (screen === 'items.edit') return 'stock';
  return DRAWER_TREE.find((g) => g.children?.some((c) => c.screen === screen))?.tone ?? 'home';
}

/** The menu icon of a screen. */
export function iconOf(screen: ScreenId): ReactNode {
  for (const g of DRAWER_TREE) {
    const leaf = g.children?.find((c) => c.screen === screen);
    if (leaf) return leaf.icon ?? g.icon;
  }
  return screen === 'items.edit' ? <ListIcon className="icon--sm" /> : <HomeIcon className="icon--sm" />;
}
