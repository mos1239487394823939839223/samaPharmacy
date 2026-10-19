/**
 * IPC contract shared by renderer, main, and the database utilityProcess.
 *
 * This file is the single definition of what can cross a process boundary.
 * Renderer imports the types only; it never imports anything that touches I/O.
 */

import type { PrintableKind } from './printing';
import type {
  ItemInput,
  ItemListRow,
  ItemDetail,
  ImportPreview,
  ImportResult,
  ImportProgressEvent,
} from './items';
import type { WarehouseInput, WarehouseRow } from './warehouses';
import type { SupplierInput, SupplierRow, SupplierLedgerRow } from './suppliers';
import type { PurchaseInvoiceInput, PurchaseInvoiceRow, PurchaseLineRow } from './purchases';
import type {
  ItemStockRow,
  BatchRow,
  StockMoveRow,
  ExpiryReport,
  StockAdjustmentInput,
  StockAdjustmentRow,
  AdjustmentMoveRow,
} from './stock';
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
import type { PharmacySettings, PharmacySettingsInput, BackupStatus, PrinterStatus } from './settings';
import type { AppErrorParams } from './errors';
import type { AuditRow } from './auth';
import type {
  ClaimableInvoice,
  ClaimLineRow,
  ClaimRow,
  ClaimSettlement,
  InsuranceCompanyInput,
  InsuranceCompanyRow,
  InsuranceReceivableRow,
} from './insurance';
import type {
  AlternativeRow,
  HeldInvoiceRow,
  InvoiceSearchRow,
  NarcoticsReconciliationRow,
  NarcoticsRow,
  PrescriptionInput,
  ResumedInvoice,
  UnitPriceIssue,
} from './narcotics';

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
  | { kind: 'import.bundledCatalog' }
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
  | { kind: 'suppliers.recordPayment'; id: number; amount: number; note?: string | null }
  | { kind: 'suppliers.ledger'; id: number; limit?: number }
  | { kind: 'purchases.create'; input: PurchaseInvoiceInput }
  | { kind: 'purchases.get'; id: number }
  | { kind: 'purchases.getBySerial'; serial: number }
  | { kind: 'purchases.list'; limit?: number; offset?: number }
  | { kind: 'purchases.confirm'; id: number }
  | { kind: 'purchases.void'; id: number }
  | { kind: 'stock.search'; query: string; limit?: number; warehouseId?: number }
  | { kind: 'stock.batches'; itemId: number }
  | { kind: 'stock.sellableBatches'; itemId: number; warehouseId?: number }
  | { kind: 'stock.batchMoves'; batchId: number }
  | { kind: 'stock.lowStock'; limit?: number }
  | { kind: 'stock.expiryReport'; asOf: string }
  | { kind: 'adjustments.create'; input: StockAdjustmentInput }
  | { kind: 'adjustments.list'; limit?: number }
  | { kind: 'adjustments.moves'; id: number }
  | { kind: 'adjustments.writeOffExpired'; warehouseId?: number }
  | { kind: 'sales.create'; input: SalesInvoiceInput }
  | { kind: 'sales.checkout'; input: SalesInvoiceInput }
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
  | { kind: 'customers.recordPayment'; id: number; amount: number; note?: string | null; cash?: boolean }
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
  | { kind: 'settings.update'; input: PharmacySettingsInput }
  | { kind: 'backup.status' }
  | { kind: 'backup.run' }
  /** Main process: folder picker for the second backup destination. */
  | { kind: 'backup.pickFolder' }
  /** Main process: file picker, then restore through the db process. */
  | { kind: 'backup.restore'; filePath?: string }
  | { kind: 'audit.list'; from?: string; to?: string; entity?: string; limit?: number }
  // --- narcotics ---
  | { kind: 'narcotics.register'; itemId?: number; from?: string; to?: string; limit?: number }
  | { kind: 'narcotics.reconciliation' }
  | { kind: 'narcotics.fix'; id: number; details: PrescriptionInput; reason: string }
  | { kind: 'sales.prescription'; id: number }
  // --- till ---
  | { kind: 'sales.hold'; input: SalesInvoiceInput }
  | { kind: 'sales.held'; warehouseId: number }
  | { kind: 'sales.resume'; id: number }
  | { kind: 'sales.search'; from?: string; to?: string; serial?: number; status?: string; limit?: number }
  | { kind: 'sales.receipt'; id: number }
  | { kind: 'documents.get'; doc: PrintableKind; id: number }
  | { kind: 'items.alternatives'; id: number; warehouseId: number }
  | { kind: 'items.unitPriceIssues' }
  | { kind: 'items.fixUnitPrices'; itemIds: number[] }
  // --- printing & files (main process) ---
  | { kind: 'print.receipt'; invoiceId: number; reprint?: boolean }
  | { kind: 'print.test' }
  | { kind: 'print.status' }
  | { kind: 'print.retryFailed' }
  | { kind: 'print.openDrawer' }
  | { kind: 'print.listPrinters' }
  | { kind: 'print.document'; doc: PrintableKind; id: number }
  | { kind: 'file.saveCsv'; defaultName: string; csv: string }
  // --- insurance ---
  | { kind: 'insurance.companies'; includeInactive?: boolean }
  | { kind: 'insurance.createCompany'; input: InsuranceCompanyInput }
  | { kind: 'insurance.updateCompany'; id: number; input: InsuranceCompanyInput }
  | { kind: 'insurance.setCompanyActive'; id: number; active: boolean }
  | { kind: 'insurance.exclusions'; id: number }
  | { kind: 'insurance.setExclusion'; id: number; itemId: number; excluded: boolean }
  | { kind: 'insurance.unclaimed'; companyId: number; from: string; to: string }
  | { kind: 'insurance.createClaim'; companyId: number; from: string; to: string }
  | { kind: 'insurance.claims'; companyId?: number }
  | { kind: 'insurance.claimLines'; id: number }
  | { kind: 'insurance.submitClaim'; id: number }
  | { kind: 'insurance.settleClaim'; id: number; input: ClaimSettlement }
  | { kind: 'insurance.receivables' };

/** Kinds the main process answers itself (dialogs, printing, files). */
export const MAIN_PROCESS_KINDS = [
  'import.pickFile',
  'import.bundledCatalog',
  'import.saveRejects',
  'backup.pickFolder',
  'print.receipt',
  'print.test',
  'print.status',
  'print.retryFailed',
  'print.openDrawer',
  'print.listPrinters',
  'print.document',
  'file.saveCsv',
] as const;



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
  | { id: number; ok: false; error: string; code?: string; params?: AppErrorParams };

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
    alternatives(id: number, warehouseId: number): Promise<AlternativeRow[]>;
    unitPriceIssues(): Promise<UnitPriceIssue[]>;
    fixUnitPrices(itemIds: number[]): Promise<number>;
  };
  import: {
    /** Opens the OS file dialog. Returns null if the user cancels. */
    pickFile(): Promise<string | null>;
    /** Path of the Egyptian drug catalog shipped with the app (دليل الأدوية). */
    bundledCatalog(): Promise<string>;
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
    recordPayment(id: number, amount: number, note?: string | null): Promise<void>;
    ledger(id: number, limit?: number): Promise<SupplierLedgerRow[]>;
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
    search(query: string, limit?: number, warehouseId?: number): Promise<ItemStockRow[]>;
    batches(itemId: number): Promise<BatchRow[]>;
    sellableBatches(itemId: number, warehouseId?: number): Promise<BatchRow[]>;
    batchMoves(batchId: number): Promise<StockMoveRow[]>;
    lowStock(limit?: number): Promise<ItemStockRow[]>;
    expiryReport(asOf: string): Promise<ExpiryReport>;
  };
  adjustments: {
    create(input: StockAdjustmentInput): Promise<number>;
    list(limit?: number): Promise<StockAdjustmentRow[]>;
    moves(id: number): Promise<AdjustmentMoveRow[]>;
    /** Writes off every expired batch; null when there was nothing to write off. */
    writeOffExpired(warehouseId?: number): Promise<{ adjustmentId: number; batchCount: number } | null>;
  };
  sales: {
    create(input: SalesInvoiceInput): Promise<number>;
    /** Create and confirm in one transaction — the POS path. */
    checkout(input: SalesInvoiceInput): Promise<number>;
    hold(input: SalesInvoiceInput): Promise<number>;
    held(warehouseId: number): Promise<HeldInvoiceRow[]>;
    resume(id: number): Promise<ResumedInvoice>;
    search(filter: { from?: string; to?: string; serial?: number; status?: string; limit?: number }): Promise<InvoiceSearchRow[]>;
    prescription(id: number): Promise<(PrescriptionInput & { id: number }) | null>;
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
    /** cash (default true): the money enters the open shift's drawer. */
    recordPayment(id: number, amount: number, note?: string | null, cash?: boolean): Promise<void>;
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
  backup: {
    status(): Promise<BackupStatus>;
    run(): Promise<BackupStatus>;
    /** Opens a folder picker; null when cancelled. */
    pickFolder(): Promise<string | null>;
    /** Opens a file picker (unless filePath is given), restores, and reloads the app. Null when cancelled. */
    restore(filePath?: string): Promise<boolean | null>;
  };
  audit: {
    list(filter?: { from?: string; to?: string; entity?: string; limit?: number }): Promise<AuditRow[]>;
  };
  narcotics: {
    register(filter?: { itemId?: number; from?: string; to?: string; limit?: number }): Promise<NarcoticsRow[]>;
    reconciliation(): Promise<NarcoticsReconciliationRow[]>;
    fix(id: number, details: PrescriptionInput, reason: string): Promise<number>;
  };
  print: {
    receipt(invoiceId: number, reprint?: boolean): Promise<void>;
    test(): Promise<void>;
    status(): Promise<PrinterStatus>;
    retryFailed(): Promise<void>;
    openDrawer(): Promise<void>;
    listPrinters(): Promise<string[]>;
    /** Full-page (A4) preview of an invoice or a return, printed through the system print dialog. */
    document(doc: PrintableKind, id: number): Promise<void>;
  };
  files: {
    /** Save-as dialog, then writes a UTF-8 CSV with BOM (opens correctly in Excel). Null when cancelled. */
    saveCsv(defaultName: string, csv: string): Promise<string | null>;
  };
  insurance: {
    companies(includeInactive?: boolean): Promise<InsuranceCompanyRow[]>;
    createCompany(input: InsuranceCompanyInput): Promise<number>;
    updateCompany(id: number, input: InsuranceCompanyInput): Promise<void>;
    setCompanyActive(id: number, active: boolean): Promise<void>;
    exclusions(id: number): Promise<Array<{ itemId: number; nameAr: string }>>;
    setExclusion(id: number, itemId: number, excluded: boolean): Promise<void>;
    unclaimed(companyId: number, from: string, to: string): Promise<ClaimableInvoice[]>;
    createClaim(companyId: number, from: string, to: string): Promise<number>;
    claims(companyId?: number): Promise<ClaimRow[]>;
    claimLines(id: number): Promise<ClaimLineRow[]>;
    submitClaim(id: number): Promise<void>;
    settleClaim(id: number, input: ClaimSettlement): Promise<void>;
    receivables(): Promise<InsuranceReceivableRow[]>;
  };
  events: {
    onPrinter(listener: (e: { level: 'info' | 'warn' | 'error'; code: string; detail?: string }) => void): () => void;
  };
}

/** Main → renderer push channel for long-running work. */
export const IPC_EVENTS = {
  importProgress: 'import:progress',
  /** Main → renderer: printer queue/fault notices (paper out, failed job). */
  printerEvent: 'printer:event',
} as const;
