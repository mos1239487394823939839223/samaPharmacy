/**
 * Navigation model — blueprint §1.1.
 *
 * Six toolbar modules with global shortcuts, plus the drawer tree. Screen ids
 * are stable strings; each maps to a placeholder until its milestone builds it.
 */

import type { Shortcut } from './shortcuts';
import { ar } from '../i18n/ar';

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
    target: 'log',
  },
];

export interface DrawerNode {
  label: string;
  screen?: ScreenId;
  children?: DrawerNode[];
}

export const DRAWER_TREE: DrawerNode[] = [
  {
    label: ar.drawer.customers,
    children: [
      { label: ar.drawer.customersList, screen: 'customers.list' },
      { label: ar.drawer.customersReports, screen: 'customers.reports' },
    ],
  },
  {
    label: ar.drawer.items,
    children: [
      { label: ar.drawer.itemsList, screen: 'items.list' },
      { label: ar.drawer.itemsStock, screen: 'items.stock' },
      { label: ar.drawer.itemsExpiry, screen: 'items.expiry' },
      { label: ar.drawer.itemsIbnSina, screen: 'items.ibnSina' },
    ],
  },
  {
    label: ar.drawer.warehouses,
    children: [{ label: ar.drawer.warehousesList, screen: 'warehouses' }],
  },
  {
    label: ar.drawer.sales,
    children: [
      { label: ar.drawer.salesInvoices, screen: 'sales.invoices' },
      { label: ar.drawer.salesShiftHandover, screen: 'sales.shiftHandover' },
      { label: ar.drawer.salesReturnByInvoice, screen: 'sales.returnByInvoice' },
      { label: ar.drawer.salesReturnGeneral, screen: 'sales.returnGeneral' },
      { label: ar.drawer.salesReports, screen: 'sales.reports' },
    ],
  },
  {
    label: ar.drawer.purchases,
    children: [
      { label: ar.drawer.purchaseInvoices, screen: 'purchases.invoices' },
      { label: ar.drawer.suppliersList, screen: 'suppliers.list' },
      { label: ar.drawer.purchaseReturnByInvoice, screen: 'purchases.returnByInvoice' },
      { label: ar.drawer.purchaseReturnGeneral, screen: 'purchases.returnGeneral' },
    ],
  },
  {
    label: ar.drawer.accounts,
    children: [{ label: ar.drawer.cashInOut, screen: 'accounts.cashInOut' }],
  },
  {
    label: ar.drawer.settings,
    children: [
      { label: ar.drawer.settingsGeneral, screen: 'settings.general' },
      { label: ar.drawer.settingsConnection, screen: 'health' },
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
  'customers.list': ar.drawer.customersList,
  'customers.reports': ar.drawer.customersReports,
  warehouses: ar.drawer.warehouses,
  'accounts.cashInOut': ar.drawer.cashInOut,
  'settings.general': ar.drawer.settingsGeneral,
  log: ar.modules.log,
  health: ar.status.connectionOk,
};
