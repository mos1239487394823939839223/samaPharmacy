/**
 * Core type definitions for Sama Pharmacy
 */

export interface Item {
  id: string;
  name: string;
  nameAr: string;
  barcode: string[];
  unitPrice: number; // piastres
  batchId?: string;
  expiryDate?: string;
  quantity: number;
  category: string;
}

export interface Batch {
  id: string;
  itemId: string;
  expiryDate: string;
  quantity: number;
  batchNumber: string;
  costPrice: number; // piastres
  notes?: string;
}

export interface InvoiceLine {
  itemId: string;
  itemName: string;
  qty: number;
  unitPrice: number; // piastres
  total: number; // piastres
  batchId?: string;
}

export interface Invoice {
  id: string;
  serial: number;
  type: 'cash' | 'credit' | 'return';
  dateTime: string;
  cashier: string;
  customerName?: string;
  lines: InvoiceLine[];
  subtotal: number; // piastres
  discount: number; // piastres
  total: number; // piastres
  paid: number; // piastres
  change: number; // piastres
  status: 'draft' | 'finalized' | 'printed';
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number; // piastres
  outstanding: number; // piastres
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'cashier' | 'pharmacist' | 'manager';
  permissions: string[];
  active: boolean;
}

export interface HardwareConfig {
  scanner: ScannerConfig;
  printer: PrinterConfig;
}

export interface ScannerConfig {
  prefixCode: string | null;
  terminator: 'Enter' | 'Tab' | 'None';
  maxIntervalMs: number;
  minLength: number;
  maxLength: number;
  debounceMs: number;
  captureTimeoutMs: number;
  idleFlushMs: number;
}

export interface PrinterConfig {
  transport: 'network' | 'share' | 'file';
  host?: string;
  port?: number;
  shareName?: string;
  filePath?: string;
  paperWidth: 58 | 80;
  drawerPin?: 2 | 5 | 'auto';
  arabicFontUrl?: string;
  autoPrint?: boolean;
  copies?: number;
}

export interface AppSettings {
  pharmacyName: string;
  pharmacyNameAr: string;
  address: string;
  phone: string;
  taxNumber?: string;
  businessRegistration?: string;
  hardware: HardwareConfig;
  currency: 'EGP' | 'USD';
  language: 'ar' | 'en';
}
