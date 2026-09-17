/**
 * Database host — runs in an Electron utilityProcess.
 *
 * better-sqlite3 is synchronous. Running it on the main process blocks the event
 * loop and freezes the window for the duration of every query, which is invisible
 * at 50 items and unusable at 35,000 (CLAUDE.md rule 6).
 *
 * This process owns the only open handle to the database. It receives request
 * envelopes over the parent port and always replies — errors are serialized into
 * the envelope rather than thrown across the boundary, because an exception here
 * would kill the process and take the handle with it.
 */

import path from 'node:path';
import {
  openDatabase,
  migrate,
  appliedVersions,
  sqliteVersion,
  createItem,
  updateItem,
  getItem,
  getItemBarcodes,
  getItemUnits,
  findByBarcode,
  searchItems,
  listItems,
  countItems,
  deactivateItem,
  readSheet,
  existingKeys,
  bulkInsertItems,
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deactivateWarehouse,
  listSuppliers,
  searchSuppliers,
  getSupplier,
  getSupplierBalance,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  createPurchaseInvoice,
  getPurchaseInvoice,
  getPurchaseInvoiceBySerial,
  getPurchaseLines,
  listPurchaseInvoices,
  confirmPurchaseInvoice,
  voidPurchaseInvoice,
  searchItemStock,
  getItemBatches,
  getSellableBatches,
  getBatchMoves,
  getLowStockItems,
  getExpiryReport,
  createSalesInvoice,
  getSalesInvoice,
  getSalesInvoiceBySerial,
  getSalesLines,
  listSalesInvoices,
  confirmSalesInvoice,
  voidSalesInvoice,
  getOpenShift,
  getShift,
  listShifts,
  openShift,
  closeShift,
  computeExpectedCash,
  recordCashTransaction,
  getShiftCashTransactions,
  getShiftSalesSummary,
  listCustomers,
  searchCustomers,
  getCustomer,
  getCustomerAddresses,
  getCustomerTags,
  createCustomer,
  updateCustomer,
  suspendCustomer,
  unsuspendCustomer,
  deactivateCustomer,
  getCustomerBalance,
  getCustomerLedger,
  recordCustomerPayment,
  getReceivablesSummary,
  createSalesReturn,
  getSalesReturn,
  getSalesReturnLines,
  listSalesReturns,
  getReturnableLines,
  createPurchaseReturn,
  getPurchaseReturn,
  getPurchaseReturnLines,
  listPurchaseReturns,
  getReturnablePurchaseLines,
  getSalesReport,
  getSalesTrend,
  getSalesReportInvoices,
  getSettings,
  updateSettings,
  type Db,
} from '@pharmacy/db';
import { guessMapping, validateRows, type ImportField } from '@pharmacy/core';
import {
  itemInputSchema,
  warehouseInputSchema,
  supplierInputSchema,
  purchaseInvoiceInputSchema,
  salesInvoiceInputSchema,
  customerInputSchema,
  salesReturnInputSchema,
  purchaseReturnInputSchema,
  pharmacySettingsInputSchema,
} from '@pharmacy/shared';
import type {
  DbRequestEnvelope,
  DbResponseEnvelope,
  PingResult,
  MigrateResult,
} from '@pharmacy/shared';

// utilityProcess exposes the parent port on process.parentPort.
declare const process: NodeJS.Process & {
  parentPort: {
    on(event: 'message', listener: (message: { data: unknown }) => void): void;
    postMessage(message: unknown): void;
  };
};

interface Config {
  databasePath: string;
  migrationsDir: string;
}

let db: Db | null = null;
let config: Config | null = null;

function init(cfg: Config): void {
  config = cfg;
  db = openDatabase(cfg.databasePath);
  // Apply pending migrations at startup so the schema is never behind the code.
  migrate(db, cfg.migrationsDir);
}

function handlePing(): PingResult {
  if (!db || !config) throw new Error('Database not initialized');
  const fk = db.pragma('foreign_keys', { simple: true });
  const journal = db.pragma('journal_mode', { simple: true });
  return {
    sqliteVersion: sqliteVersion(db),
    migrations: appliedVersions(db),
    databasePath: config.databasePath,
    foreignKeys: fk === 1,
    journalMode: String(journal),
  };
}

function handleMigrate(): MigrateResult {
  if (!db || !config) throw new Error('Database not initialized');
  const { applied } = migrate(db, config.migrationsDir);
  return { applied, alreadyCurrent: applied.length === 0 };
}

function requireDb(): Db {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function dispatch(envelope: DbRequestEnvelope): DbResponseEnvelope {
  const ok = (data: unknown): DbResponseEnvelope => ({ id: envelope.id, ok: true, data });

  try {
    const req = envelope.request;

    switch (req.kind) {
      case 'ping':
        return ok(handlePing());
      case 'migrate':
        return ok(handleMigrate());

      case 'items.list':
        return ok(listItems(requireDb(), { limit: req.limit, offset: req.offset }));

      case 'items.search':
        return ok(searchItems(requireDb(), req.query, req.limit));

      case 'items.get': {
        const conn = requireDb();
        const item = getItem(conn, req.id);
        if (!item) return ok(null);
        return ok({
          ...item,
          barcodes: getItemBarcodes(conn, req.id),
          units: getItemUnits(conn, req.id),
        });
      }

      case 'items.create':
        // Validate at the process boundary, not in the renderer — the renderer
        // is untrusted for this purpose even though we wrote it.
        return ok(createItem(requireDb(), itemInputSchema.parse(req.input)));

      case 'items.update': {
        updateItem(requireDb(), req.id, itemInputSchema.parse(req.input));
        return ok(undefined);
      }

      case 'items.deactivate': {
        deactivateItem(requireDb(), req.id);
        return ok(undefined);
      }

      case 'items.count':
        return ok(countItems(requireDb()));

      case 'items.findByBarcode':
        return ok(findByBarcode(requireDb(), req.barcode) ?? null);

      case 'import.preview': {
        const conn = requireDb();
        const { headers, rows } = readSheet(req.filePath);
        const mapping = (req.mapping ?? guessMapping(headers)) as Partial<
          Record<ImportField, number>
        >;
        const { accepted, rejected } = validateRows(rows, mapping, existingKeys(conn));
        return ok({
          filePath: req.filePath,
          headers,
          mapping,
          totalRows: rows.length,
          acceptedCount: accepted.length,
          sample: accepted.slice(0, 20),
          // Cap what crosses the boundary: a wholly mismatched mapping can
          // reject all 35,000 rows, and serialising those would stall the UI.
          rejected: rejected.slice(0, 200),
        });
      }

      case 'import.apply': {
        const conn = requireDb();
        const { rows } = readSheet(req.filePath);
        const mapping = req.mapping as Partial<Record<ImportField, number>>;
        const { accepted, rejected } = validateRows(rows, mapping, existingKeys(conn));

        const outcome = bulkInsertItems(conn, accepted, (p) =>
          process.parentPort.postMessage({ type: 'progress', channel: 'import', data: p })
        );

        return ok({
          inserted: outcome.inserted,
          rejectedCount: rejected.length,
          elapsedMs: outcome.elapsedMs,
        });
      }

      case 'warehouses.list':
        return ok(listWarehouses(requireDb(), req.includeInactive));

      case 'warehouses.get':
        return ok(getWarehouse(requireDb(), req.id) ?? null);

      case 'warehouses.create':
        return ok(createWarehouse(requireDb(), warehouseInputSchema.parse(req.input)));

      case 'warehouses.update':
        updateWarehouse(requireDb(), req.id, warehouseInputSchema.parse(req.input));
        return ok(undefined);

      case 'warehouses.deactivate':
        deactivateWarehouse(requireDb(), req.id);
        return ok(undefined);

      case 'suppliers.list':
        return ok(listSuppliers(requireDb(), req.limit));

      case 'suppliers.search':
        return ok(searchSuppliers(requireDb(), req.query, req.limit));

      case 'suppliers.get':
        return ok(getSupplier(requireDb(), req.id) ?? null);

      case 'suppliers.balance':
        return ok(getSupplierBalance(requireDb(), req.id));

      case 'suppliers.create':
        return ok(createSupplier(requireDb(), supplierInputSchema.parse(req.input)));

      case 'suppliers.update':
        updateSupplier(requireDb(), req.id, supplierInputSchema.parse(req.input));
        return ok(undefined);

      case 'suppliers.deactivate':
        deactivateSupplier(requireDb(), req.id);
        return ok(undefined);

      case 'purchases.create':
        return ok(
          createPurchaseInvoice(requireDb(), purchaseInvoiceInputSchema.parse(req.input))
        );

      case 'purchases.get': {
        const conn = requireDb();
        const invoice = getPurchaseInvoice(conn, req.id);
        if (!invoice) return ok(null);
        return ok({ ...invoice, lines: getPurchaseLines(conn, req.id) });
      }

      case 'purchases.getBySerial':
        return ok(getPurchaseInvoiceBySerial(requireDb(), req.serial) ?? null);

      case 'purchases.list':
        return ok(listPurchaseInvoices(requireDb(), req.limit, req.offset));

      case 'purchases.confirm':
        confirmPurchaseInvoice(requireDb(), req.id);
        return ok(undefined);

      case 'purchases.void':
        voidPurchaseInvoice(requireDb(), req.id);
        return ok(undefined);

      case 'stock.search':
        return ok(searchItemStock(requireDb(), req.query, req.limit));

      case 'stock.batches':
        return ok(getItemBatches(requireDb(), req.itemId));

      case 'stock.sellableBatches':
        return ok(getSellableBatches(requireDb(), req.itemId, req.warehouseId));

      case 'stock.batchMoves':
        return ok(getBatchMoves(requireDb(), req.batchId));

      case 'stock.lowStock':
        return ok(getLowStockItems(requireDb(), req.limit));

      case 'stock.expiryReport':
        return ok(getExpiryReport(requireDb(), req.asOf));

      case 'sales.create':
        return ok(createSalesInvoice(requireDb(), salesInvoiceInputSchema.parse(req.input)));

      case 'sales.get': {
        const conn = requireDb();
        const invoice = getSalesInvoice(conn, req.id);
        if (!invoice) return ok(null);
        return ok({ ...invoice, lines: getSalesLines(conn, req.id) });
      }

      case 'sales.getBySerial':
        return ok(getSalesInvoiceBySerial(requireDb(), req.serial) ?? null);

      case 'sales.list':
        return ok(listSalesInvoices(requireDb(), req.limit, req.offset));

      case 'sales.confirm':
        confirmSalesInvoice(requireDb(), req.id);
        return ok(undefined);

      case 'sales.void':
        voidSalesInvoice(requireDb(), req.id);
        return ok(undefined);

      case 'shifts.getOpen':
        return ok(getOpenShift(requireDb(), req.warehouseId) ?? null);

      case 'shifts.get':
        return ok(getShift(requireDb(), req.id) ?? null);

      case 'shifts.list':
        return ok(listShifts(requireDb(), req.limit));

      case 'shifts.open':
        return ok(openShift(requireDb(), req.warehouseId, req.openingFloat));

      case 'shifts.close':
        closeShift(requireDb(), req.id, req.input);
        return ok(undefined);

      case 'shifts.computeExpectedCash':
        return ok(computeExpectedCash(requireDb(), req.id));

      case 'shifts.recordCash':
        return ok(
          recordCashTransaction(requireDb(), req.shiftId, req.direction, req.amount, req.category, req.note)
        );

      case 'shifts.cashTransactions':
        return ok(getShiftCashTransactions(requireDb(), req.shiftId));

      case 'shifts.salesSummary':
        return ok(getShiftSalesSummary(requireDb(), req.shiftId));

      case 'customers.list':
        return ok(listCustomers(requireDb(), req.limit));

      case 'customers.search':
        return ok(searchCustomers(requireDb(), req.query, req.limit));

      case 'customers.get': {
        const conn = requireDb();
        const customer = getCustomer(conn, req.id);
        if (!customer) return ok(null);
        return ok({
          ...customer,
          addresses: getCustomerAddresses(conn, req.id),
          tags: getCustomerTags(conn, req.id),
        });
      }

      case 'customers.create':
        return ok(createCustomer(requireDb(), customerInputSchema.parse(req.input)));

      case 'customers.update':
        updateCustomer(requireDb(), req.id, customerInputSchema.parse(req.input));
        return ok(undefined);

      case 'customers.suspend':
        suspendCustomer(requireDb(), req.id);
        return ok(undefined);

      case 'customers.unsuspend':
        unsuspendCustomer(requireDb(), req.id);
        return ok(undefined);

      case 'customers.deactivate':
        deactivateCustomer(requireDb(), req.id);
        return ok(undefined);

      case 'customers.balance':
        return ok(getCustomerBalance(requireDb(), req.id));

      case 'customers.ledger':
        return ok(getCustomerLedger(requireDb(), req.id, req.limit));

      case 'customers.recordPayment':
        recordCustomerPayment(requireDb(), req.id, req.amount, req.note);
        return ok(undefined);

      case 'customers.receivablesSummary':
        return ok(getReceivablesSummary(requireDb()));

      case 'salesReturns.create':
        return ok(createSalesReturn(requireDb(), salesReturnInputSchema.parse(req.input)));

      case 'salesReturns.get': {
        const conn = requireDb();
        const ret = getSalesReturn(conn, req.id);
        if (!ret) return ok(null);
        return ok({ ...ret, lines: getSalesReturnLines(conn, req.id) });
      }

      case 'salesReturns.list':
        return ok(listSalesReturns(requireDb(), req.limit, req.offset));

      case 'salesReturns.returnableLines':
        return ok(getReturnableLines(requireDb(), req.invoiceId));

      case 'purchaseReturns.create':
        return ok(createPurchaseReturn(requireDb(), purchaseReturnInputSchema.parse(req.input)));

      case 'purchaseReturns.get': {
        const conn = requireDb();
        const ret = getPurchaseReturn(conn, req.id);
        if (!ret) return ok(null);
        return ok({ ...ret, lines: getPurchaseReturnLines(conn, req.id) });
      }

      case 'purchaseReturns.list':
        return ok(listPurchaseReturns(requireDb(), req.limit, req.offset));

      case 'purchaseReturns.returnableLines':
        return ok(getReturnablePurchaseLines(requireDb(), req.invoiceId));

      case 'sales.report':
        return ok(getSalesReport(requireDb(), req.from, req.to));

      case 'sales.reportInvoices':
        return ok(getSalesReportInvoices(requireDb(), req.from, req.to, req.limit));

      case 'sales.trend':
        return ok(getSalesTrend(requireDb(), req.from, req.to));

      case 'settings.get':
        return ok(getSettings(requireDb()));

      case 'settings.update':
        return ok(updateSettings(requireDb(), pharmacySettingsInputSchema.parse(req.input)));

      // Handled in the main process, which owns the window and the filesystem.
      // Listed so the exhaustiveness check below stays meaningful.
      case 'import.pickFile':
      case 'import.saveRejects':
        return {
          id: envelope.id,
          ok: false,
          error: `${req.kind} is handled in the main process, not the db process`,
        };

      default: {
        const exhaustive: never = req;
        return {
          id: envelope.id,
          ok: false,
          error: `Unknown request: ${JSON.stringify(exhaustive)}`,
        };
      }
    }
  } catch (err) {
    return { id: envelope.id, ok: false, error: (err as Error).message };
  }
}

process.parentPort.on('message', (message) => {
  const payload = message.data as
    | { type: 'init'; config: Config }
    | { type: 'request'; envelope: DbRequestEnvelope };

  if (payload.type === 'init') {
    try {
      init(payload.config);
      process.parentPort.postMessage({ type: 'ready' });
    } catch (err) {
      process.parentPort.postMessage({ type: 'init-failed', error: (err as Error).message });
    }
    return;
  }

  if (payload.type === 'request') {
    process.parentPort.postMessage({
      type: 'response',
      envelope: dispatch(payload.envelope),
    });
  }
});
