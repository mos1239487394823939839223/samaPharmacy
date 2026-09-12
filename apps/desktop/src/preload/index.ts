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
  type PharmacySettings,
  type PharmacySettingsInput,
} from '@pharmacy/shared';

function send<T>(request: DbRequest): Promise<T> {
  return ipcRenderer.invoke(IPC.dbRequest, request) as Promise<T>;
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
  },

  import: {
    pickFile: () => send<string | null>({ kind: 'import.pickFile' }),
    preview: (filePath, mapping) =>
      send<ImportPreview>({ kind: 'import.preview', filePath, mapping }),
    apply: (filePath, mapping) =>
      send<ImportResult>({ kind: 'import.apply', filePath, mapping }),
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
  },

  purchases: {
    create: (input: PurchaseInvoiceInput) => send<number>({ kind: 'purchases.create', input }),
    get: (id) =>
      send<(PurchaseInvoiceRow & { lines: PurchaseLineRow[] }) | null>({
        kind: 'purchases.get',
        id,
      }),
    list: (opts) =>
      send<PurchaseInvoiceRow[]>({ kind: 'purchases.list', limit: opts?.limit, offset: opts?.offset }),
    confirm: (id) => send<void>({ kind: 'purchases.confirm', id }),
    voidInvoice: (id) => send<void>({ kind: 'purchases.void', id }),
  },

  stock: {
    search: (query, limit) => send<ItemStockRow[]>({ kind: 'stock.search', query, limit }),
    batches: (itemId) => send<BatchRow[]>({ kind: 'stock.batches', itemId }),
    sellableBatches: (itemId, warehouseId) =>
      send<BatchRow[]>({ kind: 'stock.sellableBatches', itemId, warehouseId }),
    batchMoves: (batchId) => send<StockMoveRow[]>({ kind: 'stock.batchMoves', batchId }),
    lowStock: (limit) => send<ItemStockRow[]>({ kind: 'stock.lowStock', limit }),
    expiryReport: (asOf) => send<ExpiryReport>({ kind: 'stock.expiryReport', asOf }),
  },

  sales: {
    create: (input: SalesInvoiceInput) => send<number>({ kind: 'sales.create', input }),
    get: (id) =>
      send<(SalesInvoiceRow & { lines: SalesLineRow[] }) | null>({ kind: 'sales.get', id }),
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
    recordPayment: (id, amount, note) =>
      send<void>({ kind: 'customers.recordPayment', id, amount, note }),
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
  },

  settings: {
    get: () => send<PharmacySettings>({ kind: 'settings.get' }),
    update: (input) => send<PharmacySettings>({ kind: 'settings.update', input }),
  },
};

contextBridge.exposeInMainWorld('api', api);
