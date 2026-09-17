/**
 * IPC contract shared by renderer, main, and the database utilityProcess.
 *
 * This file is the single definition of what can cross a process boundary.
 * Renderer imports the types only; it never imports anything that touches I/O.
 */

import type {
  ItemInput,
  ItemListRow,
  ItemDetail,
  ImportPreview,
  ImportResult,
  ImportProgressEvent,
} from './items';
import type { WarehouseInput, WarehouseRow } from './warehouses';
import type { SupplierInput, SupplierRow } from './suppliers';
import type { PurchaseInvoiceInput, PurchaseInvoiceRow, PurchaseLineRow } from './purchases';
import type { ItemStockRow, BatchRow, StockMoveRow, ExpiryReport } from './stock';
import type {
  SalesInvoiceInput,
  SalesInvoiceRow,
  SalesLineRow,
  SalesReportRow,
  SalesReportInvoiceRow,
  SalesTrendPoint,
} from './sales';
import type { ShiftRow, CashTransactionRow, CloseShiftInput, ShiftSalesSummary } from './shifts';
import type {
  CustomerInput,
  CustomerRow,
  CustomerDetail,
  CustomerLedgerRow,
  ReceivablesSummary,
} from './customers';
import type {
  SalesReturnInput,
  SalesReturnRow,
  SalesReturnLineRow,
  ReturnableLine,
} from './sales-returns';
import type {
  PurchaseReturnInput,
  PurchaseReturnRow,
  PurchaseReturnLineRow,
  ReturnablePurchaseLine,
} from './purchase-returns';
import type { PharmacySettings, PharmacySettingsInput } from './settings';

/** Requests the main process forwards to the database utilityProcess. */
export type DbRequest =
  | { kind: 'ping' }
  | { kind: 'migrate' }
  | { kind: 'items.list'; limit?: number; offset?: number }
  | { kind: 'items.search'; query: string; limit?: number }
  | { kind: 'items.get'; id: number }
  | { kind: 'items.create'; input: ItemInput }
  | { kind: 'items.update'; id: number; input: ItemInput }
  | { kind: 'items.deactivate'; id: number }
  | { kind: 'items.count' }
  | { kind: 'items.findByBarcode'; barcode: string }
  | { kind: 'import.pickFile' }
  | { kind: 'import.preview'; filePath: string; mapping?: Record<string, number> }
  | { kind: 'import.apply'; filePath: string; mapping: Record<string, number> }
  | { kind: 'import.saveRejects'; csv: string }
  | { kind: 'warehouses.list'; includeInactive?: boolean }
  | { kind: 'warehouses.get'; id: number }
  | { kind: 'warehouses.create'; input: WarehouseInput }
  | { kind: 'warehouses.update'; id: number; input: WarehouseInput }
  | { kind: 'warehouses.deactivate'; id: number }
  | { kind: 'suppliers.list'; limit?: number }
  | { kind: 'suppliers.search'; query: string; limit?: number }
  | { kind: 'suppliers.get'; id: number }
  | { kind: 'suppliers.balance'; id: number }
  | { kind: 'suppliers.create'; input: SupplierInput }
  | { kind: 'suppliers.update'; id: number; input: SupplierInput }
  | { kind: 'suppliers.deactivate'; id: number }
  | { kind: 'purchases.create'; input: PurchaseInvoiceInput }
  | { kind: 'purchases.get'; id: number }
  | { kind: 'purchases.getBySerial'; serial: number }
  | { kind: 'purchases.list'; limit?: number; offset?: number }
  | { kind: 'purchases.confirm'; id: number }
  | { kind: 'purchases.void'; id: number }
  | { kind: 'stock.search'; query: string; limit?: number }
  | { kind: 'stock.batches'; itemId: number }
  | { kind: 'stock.sellableBatches'; itemId: number; warehouseId?: number }
  | { kind: 'stock.batchMoves'; batchId: number }
  | { kind: 'stock.lowStock'; limit?: number }
  | { kind: 'stock.expiryReport'; asOf: string }
  | { kind: 'sales.create'; input: SalesInvoiceInput }
  | { kind: 'sales.get'; id: number }
  | { kind: 'sales.getBySerial'; serial: number }
  | { kind: 'sales.list'; limit?: number; offset?: number }
  | { kind: 'sales.confirm'; id: number }
  | { kind: 'sales.void'; id: number }
  | { kind: 'shifts.getOpen'; warehouseId: number }
  | { kind: 'shifts.get'; id: number }
  | { kind: 'shifts.list'; limit?: number }
  | { kind: 'shifts.open'; warehouseId: number; openingFloat: number }
  | { kind: 'shifts.close'; id: number; input: CloseShiftInput }
  | { kind: 'shifts.computeExpectedCash'; id: number }
  | { kind: 'shifts.recordCash'; shiftId: number; direction: 'in' | 'out'; amount: number; category?: string | null; note?: string | null }
  | { kind: 'shifts.cashTransactions'; shiftId: number }
  | { kind: 'shifts.salesSummary'; shiftId: number }
  | { kind: 'customers.list'; limit?: number }
  | { kind: 'customers.search'; query: string; limit?: number }
  | { kind: 'customers.get'; id: number }
  | { kind: 'customers.create'; input: CustomerInput }
  | { kind: 'customers.update'; id: number; input: CustomerInput }
  | { kind: 'customers.suspend'; id: number }
  | { kind: 'customers.unsuspend'; id: number }
  | { kind: 'customers.deactivate'; id: number }
  | { kind: 'customers.balance'; id: number }
  | { kind: 'customers.ledger'; id: number; limit?: number }
  | { kind: 'customers.recordPayment'; id: number; amount: number; note?: string | null }
  | { kind: 'customers.receivablesSummary' }
  | { kind: 'salesReturns.create'; input: SalesReturnInput }
  | { kind: 'salesReturns.get'; id: number }
  | { kind: 'salesReturns.list'; limit?: number; offset?: number }
  | { kind: 'salesReturns.returnableLines'; invoiceId: number }
  | { kind: 'purchaseReturns.create'; input: PurchaseReturnInput }
  | { kind: 'purchaseReturns.get'; id: number }
  | { kind: 'purchaseReturns.list'; limit?: number; offset?: number }
  | { kind: 'purchaseReturns.returnableLines'; invoiceId: number }
  | { kind: 'sales.report'; from: string; to: string }
  | { kind: 'sales.reportInvoices'; from: string; to: string; limit?: number }
  | { kind: 'sales.trend'; from: string; to: string }
  | { kind: 'settings.get' }
  | { kind: 'settings.update'; input: PharmacySettingsInput };

export interface PingResult {
  sqliteVersion: string;
  /** Applied migration versions, ascending. */
  migrations: number[];
  /** Absolute path to the open database file. */
  databasePath: string;
  foreignKeys: boolean;
  journalMode: string;
}

export interface MigrateResult {
  applied: number[];
  alreadyCurrent: boolean;
}

export type DbResultMap = {
  ping: PingResult;
  migrate: MigrateResult;
};

/** Envelope for a request sent to the db process. */
export interface DbRequestEnvelope {
  id: number;
  request: DbRequest;
}

/** Envelope for a reply from the db process. Never throws across the boundary. */
export type DbResponseEnvelope =
  | { id: number; ok: true; data: unknown }
  | { id: number; ok: false; error: string };

/** IPC channel names. Kept here so main and preload cannot drift apart. */
export const IPC = {
  dbRequest: 'db:request',
} as const;

/**
 * The surface exposed on `window.api` by the preload script.
 * Renderer code is written against this interface and nothing else.
 */
export interface RendererApi {
  ping(): Promise<PingResult>;
  items: {
    list(opts?: { limit?: number; offset?: number }): Promise<ItemListRow[]>;
    search(query: string, limit?: number): Promise<ItemListRow[]>;
    get(id: number): Promise<ItemDetail | null>;
    create(input: ItemInput): Promise<number>;
    update(id: number, input: ItemInput): Promise<void>;
    deactivate(id: number): Promise<void>;
    count(): Promise<number>;
    findByBarcode(barcode: string): Promise<ItemListRow | null>;
  };
  import: {
    /** Opens the OS file dialog. Returns null if the user cancels. */
    pickFile(): Promise<string | null>;
    preview(filePath: string, mapping?: Record<string, number>): Promise<ImportPreview>;
    apply(filePath: string, mapping: Record<string, number>): Promise<ImportResult>;
    /** Writes the rejected-rows CSV somewhere the user chooses. */
    saveRejects(csv: string): Promise<string | null>;
    onProgress(listener: (p: ImportProgressEvent) => void): () => void;
  };
  warehouses: {
    list(includeInactive?: boolean): Promise<WarehouseRow[]>;
    get(id: number): Promise<WarehouseRow | null>;
    create(input: WarehouseInput): Promise<number>;
    update(id: number, input: WarehouseInput): Promise<void>;
    deactivate(id: number): Promise<void>;
  };
  suppliers: {
    list(limit?: number): Promise<SupplierRow[]>;
    search(query: string, limit?: number): Promise<SupplierRow[]>;
    get(id: number): Promise<SupplierRow | null>;
    balance(id: number): Promise<number>;
    create(input: SupplierInput): Promise<number>;
    update(id: number, input: SupplierInput): Promise<void>;
    deactivate(id: number): Promise<void>;
  };
  purchases: {
    create(input: PurchaseInvoiceInput): Promise<number>;
    get(id: number): Promise<(PurchaseInvoiceRow & { lines: PurchaseLineRow[] }) | null>;
    getBySerial(serial: number): Promise<PurchaseInvoiceRow | null>;
    list(opts?: { limit?: number; offset?: number }): Promise<PurchaseInvoiceRow[]>;
    /** Creates batches, writes stock_moves, posts the supplier ledger. */
    confirm(id: number): Promise<void>;
    voidInvoice(id: number): Promise<void>;
  };
  stock: {
    search(query: string, limit?: number): Promise<ItemStockRow[]>;
    batches(itemId: number): Promise<BatchRow[]>;
    sellableBatches(itemId: number, warehouseId?: number): Promise<BatchRow[]>;
    batchMoves(batchId: number): Promise<StockMoveRow[]>;
    lowStock(limit?: number): Promise<ItemStockRow[]>;
    expiryReport(asOf: string): Promise<ExpiryReport>;
  };
  sales: {
    create(input: SalesInvoiceInput): Promise<number>;
    get(id: number): Promise<(SalesInvoiceRow & { lines: SalesLineRow[] }) | null>;
    getBySerial(serial: number): Promise<SalesInvoiceRow | null>;
    list(opts?: { limit?: number; offset?: number }): Promise<SalesInvoiceRow[]>;
    /** Decrements stock, writes stock_moves. Only place a sale actually leaves the pharmacy. */
    confirm(id: number): Promise<void>;
    voidInvoice(id: number): Promise<void>;
  };
  shifts: {
    getOpen(warehouseId: number): Promise<ShiftRow | null>;
    get(id: number): Promise<ShiftRow | null>;
    list(limit?: number): Promise<ShiftRow[]>;
    open(warehouseId: number, openingFloat: number): Promise<number>;
    /** BR-10: irreversible. Computes expected cash, records variance, marks closed. */
    close(id: number, input: CloseShiftInput): Promise<void>;
    computeExpectedCash(id: number): Promise<number>;
    recordCash(
      shiftId: number,
      direction: 'in' | 'out',
      amount: number,
      category?: string | null,
      note?: string | null
    ): Promise<number>;
    cashTransactions(shiftId: number): Promise<CashTransactionRow[]>;
    salesSummary(shiftId: number): Promise<ShiftSalesSummary>;
  };
  customers: {
    list(limit?: number): Promise<CustomerRow[]>;
    search(query: string, limit?: number): Promise<CustomerRow[]>;
    get(id: number): Promise<CustomerDetail | null>;
    create(input: CustomerInput): Promise<number>;
    update(id: number, input: CustomerInput): Promise<void>;
    suspend(id: number): Promise<void>;
    unsuspend(id: number): Promise<void>;
    deactivate(id: number): Promise<void>;
    balance(id: number): Promise<number>;
    ledger(id: number, limit?: number): Promise<CustomerLedgerRow[]>;
    recordPayment(id: number, amount: number, note?: string | null): Promise<void>;
    receivablesSummary(): Promise<ReceivablesSummary>;
  };
  salesReturns: {
    create(input: SalesReturnInput): Promise<number>;
    get(id: number): Promise<(SalesReturnRow & { lines: SalesReturnLineRow[] }) | null>;
    list(opts?: { limit?: number; offset?: number }): Promise<SalesReturnRow[]>;
    returnableLines(invoiceId: number): Promise<ReturnableLine[]>;
  };
  purchaseReturns: {
    create(input: PurchaseReturnInput): Promise<number>;
    get(id: number): Promise<(PurchaseReturnRow & { lines: PurchaseReturnLineRow[] }) | null>;
    list(opts?: { limit?: number; offset?: number }): Promise<PurchaseReturnRow[]>;
    returnableLines(invoiceId: number): Promise<ReturnablePurchaseLine[]>;
  };
  salesReport: {
    summary(from: string, to: string): Promise<SalesReportRow>;
    invoices(from: string, to: string, limit?: number): Promise<SalesReportInvoiceRow[]>;
    trend(from: string, to: string): Promise<SalesTrendPoint[]>;
  };
  settings: {
    get(): Promise<PharmacySettings>;
    update(input: PharmacySettingsInput): Promise<PharmacySettings>;
  };
}

/** Main → renderer push channel for long-running work. */
export const IPC_EVENTS = {
  importProgress: 'import:progress',
} as const;
