/**
 * Zustand store for app state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Invoice, Item, Customer, User, AppSettings } from '../types';

interface AppState {
  // UI state
  currentScreen: 'sales' | 'purchase' | 'inventory' | 'returns' | 'settings' | 'reports';
  sidebarOpen: boolean;
  darkMode: boolean;

  // Current session
  currentUser: User | null;
  currentInvoice: Invoice | null;
  currentCart: Invoice['lines'];

  // Collections
  items: Item[];
  customers: Customer[];
  invoices: Invoice[];
  users: User[];

  // Settings
  settings: AppSettings;

  // Hardware diagnostics
  scannerDiagnostics: any;
  printerStatus: any;

  // Actions
  setCurrentScreen: (screen: AppState['currentScreen']) => void;
  setCurrentUser: (user: User | null) => void;
  setCurrentInvoice: (invoice: Invoice | null) => void;
  addToCart: (line: Invoice['lines'][0]) => void;
  removeFromCart: (itemId: string) => void;
  updateCartLine: (itemId: string, qty: number) => void;
  clearCart: () => void;
  setItems: (items: Item[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setInvoices: (invoices: Invoice[]) => void;
  setUsers: (users: User[]) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  setScannerDiagnostics: (diag: any) => void;
  setPrinterStatus: (status: any) => void;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set) => ({
    currentScreen: 'sales',
    sidebarOpen: true,
    darkMode: false,
    currentUser: null,
    currentInvoice: null,
    currentCart: [],
    items: [],
    customers: [],
    invoices: [],
    users: [],
    settings: {
      pharmacyName: 'Sama Pharmacy',
      pharmacyNameAr: 'صيدلية سما',
      address: 'Cairo, Egypt',
      phone: '+20 100 000 0000',
      currency: 'EGP',
      language: 'ar',
      hardware: {
        scanner: {
          prefixCode: 'F9',
          terminator: 'Enter',
          maxIntervalMs: 35,
          minLength: 4,
          maxLength: 32,
          debounceMs: 300,
          captureTimeoutMs: 600,
          idleFlushMs: 120,
        },
        printer: {
          transport: 'network',
          host: '192.168.1.50',
          port: 9100,
          paperWidth: 80,
          drawerPin: 'auto',
        },
      },
    },
    scannerDiagnostics: null,
    printerStatus: null,

    setCurrentScreen: (screen) => set({ currentScreen: screen }),
    setCurrentUser: (user) => set({ currentUser: user }),
    setCurrentInvoice: (invoice) => set({ currentInvoice: invoice }),
    addToCart: (line) =>
      set((state) => {
        const existing = state.currentCart.find((l) => l.itemId === line.itemId);
        if (existing) {
          return {
            currentCart: state.currentCart.map((l) =>
              l.itemId === line.itemId ? { ...l, qty: l.qty + line.qty } : l
            ),
          };
        }
        return { currentCart: [...state.currentCart, line] };
      }),
    removeFromCart: (itemId) =>
      set((state) => ({
        currentCart: state.currentCart.filter((l) => l.itemId !== itemId),
      })),
    updateCartLine: (itemId, qty) =>
      set((state) => ({
        currentCart: state.currentCart.map((l) =>
          l.itemId === itemId ? { ...l, qty } : l
        ),
      })),
    clearCart: () => set({ currentCart: [] }),
    setItems: (items) => set({ items }),
    setCustomers: (customers) => set({ customers }),
    setInvoices: (invoices) => set({ invoices }),
    setUsers: (users) => set({ users }),
    setSettings: (settings) =>
      set((state) => ({
        settings: { ...state.settings, ...settings },
      })),
    setScannerDiagnostics: (diag) => set({ scannerDiagnostics: diag }),
    setPrinterStatus: (status) => set({ printerStatus: status }),
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  }))
);
