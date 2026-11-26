/**
 * Preload — the only bridge between renderer and main.
 *
 * Exposes one typed `api` object. `ipcRenderer` itself is never exposed: handing
 * the renderer a general-purpose channel would let any script in it reach the
 * whole main-process surface, which is the thing contextIsolation exists to stop.
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC,
  IPC_EVENTS,
  type DbRequest,
  type ImportPreview,
  type ShortageRow,
  type Valuation,
  type ImportProgressEvent,
  type ImportResult,
  type ItemDetail,
  type ItemInput,
  type ItemListRow,
  type PingResult,
  type RendererApi,
  type WarehouseInput,
  type WarehouseRow,
  type SupplierInput,
  type SupplierRow,
  type SupplierLedgerRow,
  type StockAdjustmentInput,
  type StockAdjustmentRow,
  type AdjustmentMoveRow,
  type BackupStatus,
  type AuditRow,
  type NarcoticsRow,
  type NarcoticsReconciliationRow,
  type HeldInvoiceRow,
  type ResumedInvoice,
  type InvoiceSearchRow,
  type AlternativeRow,
  type UnitPriceIssue,
  type PrinterStatus,
  type PrescriptionInput,
  type PurchaseInvoiceInput,
  type PurchaseInvoiceRow,
  type PurchaseLineRow,
  type ItemStockRow,
  type BatchRow,
  type StockMoveRow,
  type ExpiryReport,
  type SalesInvoiceInput,
  type SalesInvoiceRow,
  type SalesLineRow,
  type ShiftRow,
  type CashTransactionRow,
  type CloseShiftInput,
  type ShiftSalesSummary,
  type CustomerInput,
  type CustomerRow,
  type CustomerDetail,
  type CustomerLedgerRow,
  type ReceivablesSummary,
  type SalesReturnInput,
  type SalesReturnRow,
  type SalesReturnLineRow,
  type ReturnableLine,
  type PurchaseReturnInput,
  type PurchaseReturnRow,
  type PurchaseReturnLineRow,
  type ReturnablePurchaseLine,
  type SalesReportRow,
  type SalesReportInvoiceRow,
  type SalesTrendPoint,
  type PharmacySettings,
  type PharmacySettingsInput,
} from '@pharmacy/shared';

function send<T>(request: DbRequest): Promise<T> {
  return ipcRenderer.invoke(IPC.dbRequest, request) as Promise<T>;
}

/** Subscribe to a main → renderer push channel without exposing the IpcRendererEvent. */
function subscribe<T>(channel: string, listener: (data: T) => void): () => void {
  const handler = (_e: unknown, data: T) => listener(data);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const api: RendererApi = {
  ping: () => send<PingResult>({ kind: 'ping' }),

  items: {
    list: (opts) =>
      send<ItemListRow[]>({ kind: 'items.list', limit: opts?.limit, offset: opts?.offset }),
    search: (query, limit) => send<ItemListRow[]>({ kind: 'items.search', query, limit }),
    get: (id) => send<ItemDetail | null>({ kind: 'items.get', id }),
    create: (input: ItemInput) => send<number>({ kind: 'items.create', input }),
    update: (id, input: ItemInput) => send<void>({ kind: 'items.update', id, input }),
    deactivate: (id) => send<void>({ kind: 'items.deactivate', id }),
    count: () => send<number>({ kind: 'items.count' }),
    findByBarcode: (barcode) =>
      send<ItemListRow | null>({ kind: 'items.findByBarcode', barcode }),
    alternatives: (id, warehouseId) => send<AlternativeRow[]>({ kind: 'items.alternatives', id, warehouseId }),
    unitPriceIssues: () => send<UnitPriceIssue[]>({ kind: 'items.unitPriceIssues' }),
    fixUnitPrices: (itemIds) => send<number>({ kind: 'items.fixUnitPrices', itemIds }),
    exportSheet: () => send<{ headers: string[]; rows: (string | number)[][] }>({ kind: 'items.export' }),
  },

  valuation: {
    get: (warehouseId) => send<Valuation>({ kind: 'stock.valuation', warehouseId }),
    opening: (input) => send<{ adjustmentId: number; lines: number }>({ kind: 'stock.opening', input }),
  },

  shortages: {
    list: (scope) => send<ShortageRow[]>({ kind: 'shortages.list', scope }),
    activeItems: () => send<number[]>({ kind: 'shortages.activeItems' }),
    add: (input) => send<number>({ kind: 'shortages.add', input }),
    update: (id, input) => send<void>({ kind: 'shortages.update', id, input }),
    setStatus: (id, status) => send<void>({ kind: 'shortages.setStatus', id, status }),
  },

  import: {
    pickFile: () => send<string | null>({ kind: 'import.pickFile' }),
    preview: (filePath, mapping, mode) =>
      send<ImportPreview>({ kind: 'import.preview', filePath, mapping, mode }),
    apply: (filePath, mapping, mode) =>
      send<ImportResult>({ kind: 'import.apply', filePath, mapping, mode }),
    saveRejects: (csv) => send<string | null>({ kind: 'import.saveRejects', csv }),
    onProgress: (listener: (p: ImportProgressEvent) => void) => {
      // Wrap rather than passing the listener to ipcRenderer directly, so the
      // renderer never receives the IpcRendererEvent and with it a handle back
      // into the main process.
      const handler = (_e: unknown, data: ImportProgressEvent) => listener(data);
      ipcRenderer.on(IPC_EVENTS.importProgress, handler);
      return () => ipcRenderer.removeListener(IPC_EVENTS.importProgress, handler);
    },
  },

  warehouses: {
    list: (includeInactive) => send<WarehouseRow[]>({ kind: 'warehouses.list', includeInactive }),
    get: (id) => send<WarehouseRow | null>({ kind: 'warehouses.get', id }),
    create: (input: WarehouseInput) => send<number>({ kind: 'warehouses.create', input }),
    update: (id, input: WarehouseInput) => send<void>({ kind: 'warehouses.update', id, input }),
    deactivate: (id) => send<void>({ kind: 'warehouses.deactivate', id }),
  },

  suppliers: {
    list: (limit) => send<SupplierRow[]>({ kind: 'suppliers.list', limit }),
    search: (query, limit) => send<SupplierRow[]>({ kind: 'suppliers.search', query, limit }),
    get: (id) => send<SupplierRow | null>({ kind: 'suppliers.get', id }),
    balance: (id) => send<number>({ kind: 'suppliers.balance', id }),
    create: (input: SupplierInput) => send<number>({ kind: 'suppliers.create', input }),
    update: (id, input: SupplierInput) => send<void>({ kind: 'suppliers.update', id, input }),
    deactivate: (id) => send<void>({ kind: 'suppliers.deactivate', id }),
    recordPayment: (id, amount, note) => send<void>({ kind: 'suppliers.recordPayment', id, amount, note }),
    ledger: (id, limit) => send<SupplierLedgerRow[]>({ kind: 'suppliers.ledger', id, limit }),
  },

  purchases: {
    create: (input: PurchaseInvoiceInput) => send<number>({ kind: 'purchases.create', input }),
    get: (id) =>
      send<(PurchaseInvoiceRow & { lines: PurchaseLineRow[] }) | null>({
        kind: 'purchases.get',
        id,
      }),
    getBySerial: (serial) => send<PurchaseInvoiceRow | null>({ kind: 'purchases.getBySerial', serial }),
    list: (opts) =>
      send<PurchaseInvoiceRow[]>({ kind: 'purchases.list', limit: opts?.limit, offset: opts?.offset }),
    confirm: (id) => send<void>({ kind: 'purchases.confirm', id }),
    voidInvoice: (id) => send<void>({ kind: 'purchases.void', id }),
  },

  stock: {
    search: (query, limit, warehouseId, inStockOnly) => send<ItemStockRow[]>({ kind: 'stock.search', query, limit, warehouseId, inStockOnly }),
    batches: (itemId) => send<BatchRow[]>({ kind: 'stock.batches', itemId }),
    sellableBatches: (itemId, warehouseId) =>
      send<BatchRow[]>({ kind: 'stock.sellableBatches', itemId, warehouseId }),
    batchMoves: (batchId) => send<StockMoveRow[]>({ kind: 'stock.batchMoves', batchId }),
    lowStock: (limit) => send<ItemStockRow[]>({ kind: 'stock.lowStock', limit }),
    expiryReport: (asOf) => send<ExpiryReport>({ kind: 'stock.expiryReport', asOf }),
  },

  adjustments: {
    create: (input: StockAdjustmentInput) => send<number>({ kind: 'adjustments.create', input }),
    list: (limit) => send<StockAdjustmentRow[]>({ kind: 'adjustments.list', limit }),
    moves: (id) => send<AdjustmentMoveRow[]>({ kind: 'adjustments.moves', id }),
    writeOffExpired: (warehouseId) =>
      send<{ adjustmentId: number; batchCount: number } | null>({ kind: 'adjustments.writeOffExpired', warehouseId }),
  },

  sales: {
    create: (input: SalesInvoiceInput) => send<number>({ kind: 'sales.create', input }),
    checkout: (input: SalesInvoiceInput) => send<number>({ kind: 'sales.checkout', input }),
    hold: (input: SalesInvoiceInput) => send<number>({ kind: 'sales.hold', input }),
    held: (warehouseId) => send<HeldInvoiceRow[]>({ kind: 'sales.held', warehouseId }),
    resume: (id) => send<ResumedInvoice>({ kind: 'sales.resume', id }),
    search: (filter) => send<InvoiceSearchRow[]>({ kind: 'sales.search', ...filter }),
    prescription: (id) => send<(PrescriptionInput & { id: number }) | null>({ kind: 'sales.prescription', id }),
    get: (id) =>
      send<(SalesInvoiceRow & { lines: SalesLineRow[] }) | null>({ kind: 'sales.get', id }),
    getBySerial: (serial) => send<SalesInvoiceRow | null>({ kind: 'sales.getBySerial', serial }),
    list: (opts) =>
      send<SalesInvoiceRow[]>({ kind: 'sales.list', limit: opts?.limit, offset: opts?.offset }),
    confirm: (id) => send<void>({ kind: 'sales.confirm', id }),
    voidInvoice: (id) => send<void>({ kind: 'sales.void', id }),
  },

  shifts: {
    getOpen: (warehouseId) => send<ShiftRow | null>({ kind: 'shifts.getOpen', warehouseId }),
    get: (id) => send<ShiftRow | null>({ kind: 'shifts.get', id }),
    list: (limit) => send<ShiftRow[]>({ kind: 'shifts.list', limit }),
    open: (warehouseId, openingFloat) =>
      send<number>({ kind: 'shifts.open', warehouseId, openingFloat }),
    close: (id, input: CloseShiftInput) => send<void>({ kind: 'shifts.close', id, input }),
    computeExpectedCash: (id) => send<number>({ kind: 'shifts.computeExpectedCash', id }),
    recordCash: (shiftId, direction, amount, category, note) =>
      send<number>({ kind: 'shifts.recordCash', shiftId, direction, amount, category, note }),
    cashTransactions: (shiftId) =>
      send<CashTransactionRow[]>({ kind: 'shifts.cashTransactions', shiftId }),
    salesSummary: (shiftId) => send<ShiftSalesSummary>({ kind: 'shifts.salesSummary', shiftId }),
  },

  customers: {
    list: (limit) => send<CustomerRow[]>({ kind: 'customers.list', limit }),
    search: (query, limit) => send<CustomerRow[]>({ kind: 'customers.search', query, limit }),
    get: (id) => send<CustomerDetail | null>({ kind: 'customers.get', id }),
    create: (input: CustomerInput) => send<number>({ kind: 'customers.create', input }),
    update: (id, input: CustomerInput) => send<void>({ kind: 'customers.update', id, input }),
    suspend: (id) => send<void>({ kind: 'customers.suspend', id }),
    unsuspend: (id) => send<void>({ kind: 'customers.unsuspend', id }),
    deactivate: (id) => send<void>({ kind: 'customers.deactivate', id }),
    balance: (id) => send<number>({ kind: 'customers.balance', id }),
    ledger: (id, limit) => send<CustomerLedgerRow[]>({ kind: 'customers.ledger', id, limit }),
    recordPayment: (id, amount, note, cash) =>
      send<void>({ kind: 'customers.recordPayment', id, amount, note, cash }),
    receivablesSummary: () =>
      send<ReceivablesSummary>({ kind: 'customers.receivablesSummary' }),
  },

  salesReturns: {
    create: (input: SalesReturnInput) => send<number>({ kind: 'salesReturns.create', input }),
    get: (id) =>
      send<(SalesReturnRow & { lines: SalesReturnLineRow[] }) | null>({ kind: 'salesReturns.get', id }),
    list: (opts) =>
      send<SalesReturnRow[]>({ kind: 'salesReturns.list', limit: opts?.limit, offset: opts?.offset }),
    returnableLines: (invoiceId) =>
      send<ReturnableLine[]>({ kind: 'salesReturns.returnableLines', invoiceId }),
  },

  purchaseReturns: {
    create: (input: PurchaseReturnInput) => send<number>({ kind: 'purchaseReturns.create', input }),
    get: (id) =>
      send<(PurchaseReturnRow & { lines: PurchaseReturnLineRow[] }) | null>({
        kind: 'purchaseReturns.get',
        id,
      }),
    list: (opts) =>
      send<PurchaseReturnRow[]>({
        kind: 'purchaseReturns.list',
        limit: opts?.limit,
        offset: opts?.offset,
      }),
    returnableLines: (invoiceId) =>
      send<ReturnablePurchaseLine[]>({ kind: 'purchaseReturns.returnableLines', invoiceId }),
  },

  salesReport: {
    summary: (from, to) => send<SalesReportRow>({ kind: 'sales.report', from, to }),
    invoices: (from, to, limit) =>
      send<SalesReportInvoiceRow[]>({ kind: 'sales.reportInvoices', from, to, limit }),
    trend: (from, to) => send<SalesTrendPoint[]>({ kind: 'sales.trend', from, to }),
  },

  settings: {
    get: () => send<PharmacySettings>({ kind: 'settings.get' }),
    update: (input) => send<PharmacySettings>({ kind: 'settings.update', input }),
  },

  backup: {
    status: () => send<BackupStatus>({ kind: 'backup.status' }),
    run: () => send<BackupStatus>({ kind: 'backup.run' }),
    pickFolder: () => send<string | null>({ kind: 'backup.pickFolder' }),
    restore: (filePath) => send<boolean | null>({ kind: 'backup.restore', filePath }),
  },

  audit: {
    list: (filter) => send<AuditRow[]>({ kind: 'audit.list', ...(filter ?? {}) }),
  },

  narcotics: {
    register: (filter) => send<NarcoticsRow[]>({ kind: 'narcotics.register', ...(filter ?? {}) }),
    reconciliation: () => send<NarcoticsReconciliationRow[]>({ kind: 'narcotics.reconciliation' }),
    fix: (id, details, reason) => send<number>({ kind: 'narcotics.fix', id, details, reason }),
  },

  print: {
    receipt: (invoiceId, reprint) => send<void>({ kind: 'print.receipt', invoiceId, reprint }),
    test: () => send<void>({ kind: 'print.test' }),
    status: () => send<PrinterStatus>({ kind: 'print.status' }),
    retryFailed: () => send<void>({ kind: 'print.retryFailed' }),
    openDrawer: () => send<void>({ kind: 'print.openDrawer' }),
    listPrinters: () => send<string[]>({ kind: 'print.listPrinters' }),
    document: (doc, id) => send<void>({ kind: 'print.document', doc, id }),
  },

  files: {
    saveCsv: (defaultName, csv) => send<string | null>({ kind: 'file.saveCsv', defaultName, csv }),
  },

  insurance: {
    companies: (includeInactive) => send({ kind: 'insurance.companies', includeInactive }),
    createCompany: (input) => send({ kind: 'insurance.createCompany', input }),
    updateCompany: (id, input) => send({ kind: 'insurance.updateCompany', id, input }),
    setCompanyActive: (id, active) => send({ kind: 'insurance.setCompanyActive', id, active }),
    exclusions: (id) => send({ kind: 'insurance.exclusions', id }),
    setExclusion: (id, itemId, excluded) => send({ kind: 'insurance.setExclusion', id, itemId, excluded }),
    unclaimed: (companyId, from, to) => send({ kind: 'insurance.unclaimed', companyId, from, to }),
    createClaim: (companyId, from, to) => send({ kind: 'insurance.createClaim', companyId, from, to }),
    claims: (companyId) => send({ kind: 'insurance.claims', companyId }),
    claimLines: (id) => send({ kind: 'insurance.claimLines', id }),
    submitClaim: (id) => send({ kind: 'insurance.submitClaim', id }),
    settleClaim: (id, input) => send({ kind: 'insurance.settleClaim', id, input }),
    receivables: () => send({ kind: 'insurance.receivables' }),
  },

  events: {
    onPrinter: (listener) => subscribe(IPC_EVENTS.printerEvent, listener),
  },
};

contextBridge.exposeInMainWorld('api', api);
