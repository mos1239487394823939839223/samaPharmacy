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

import fs from 'node:fs';
import {
  openDatabase,
  migrate,
  appliedVersions,
  pendingMigrations,
  backupDatabase,
  listBackups,
  verifyBackup,
  getBackupSettings,
  checkoutSalesInvoice,
  recordSupplierPayment,
  getSupplierLedger,
  createStockAdjustment,
  listStockAdjustments,
  getStockAdjustmentMoves,
  writeOffExpired,
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
  exportItemsSheet,
  listShortages,
  getStockValuation,
  postOpeningStock,
  activeShortageItemIds,
  addShortage,
  updateShortage,
  setShortageStatus,
  planImport,
  updateImportedItems,
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
  listAudit,
  listNarcoticsRegister,
  narcoticsReconciliation,
  fixNarcoticsEntry,
  getInvoicePrescription,
  holdSalesInvoice,
  listHeldInvoices,
  resumeHeldInvoice,
  searchSalesInvoices,
  getReceiptData,
  getPrintableDocument,
  findAlternatives,
  unitPriceIssues,
  fixUnitPrices,
  getPharmacyProfile,
  getPrinterSettings,
  listInsuranceCompanies,
  createInsuranceCompany,
  updateInsuranceCompany,
  setInsuranceCompanyActive,
  listExclusions,
  setExclusion,
  unclaimedInvoices,
  createClaim,
  listClaims,
  getClaimLines,
  submitClaim,
  settleClaim,
  insuranceReceivables,
  type Db,
} from '@pharmacy/db';
import { auditRequest, OPERATOR_ID } from './access';
import { DomainError, guessMapping, validateRows, type ImportField } from '@pharmacy/core';
import {
  encodeAppError,
  customerPaymentSchema,
  supplierPaymentSchema,
  openShiftSchema,
  closeShiftSchema,
  cashTransactionSchema,
  stockAdjustmentInputSchema,
  itemInputSchema,
  warehouseInputSchema,
  supplierInputSchema,
  purchaseInvoiceInputSchema,
  salesInvoiceInputSchema,
  customerInputSchema,
  salesReturnInputSchema,
  purchaseReturnInputSchema,
  pharmacySettingsInputSchema,
  prescriptionSchema,
  insuranceCompanyInputSchema,
  shortageInputSchema,
  openingStockSchema,
  shortageUpdateSchema,
  shortageStatusSchema,
  claimSettlementSchema,
} from '@pharmacy/shared';
import type {
  DbRequestEnvelope,
  DbResponseEnvelope,
  PingResult,
  MigrateResult,
  BackupStatus,
} from '@pharmacy/shared';
import { z } from 'zod';

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
  /** Primary backup folder (userData/backups). */
  backupDir: string;
}

let db: Db | null = null;
let config: Config | null = null;
let backupTimer: ReturnType<typeof setInterval> | null = null;
let lastBackupError: string | null = null;

function openAndMigrate(cfg: Config): void {
  db = openDatabase(cfg.databasePath);
  // A database that already holds data is backed up before any pending
  // migration touches it — 0006 rebuilds the batches table.
  const pending = pendingMigrations(db, cfg.migrationsDir);
  if (pending.length > 0 && appliedVersions(db).length > 0) {
    runBackup('pre-migration');
  }
  // Apply pending migrations at startup so the schema is never behind the code.
  migrate(db, cfg.migrationsDir);
}

function init(cfg: Config): void {
  config = cfg;
  openAndMigrate(cfg);
  scheduleBackups();
}

/** Back up now. Never throws — a failed backup must not take down a sale. */
function runBackup(reason: 'auto' | 'close' | 'manual' | 'pre-migration' | 'before-restore'): void {
  if (!db || !config) return;
  try {
    const settings = getBackupSettings(db);
    const result = backupDatabase(db, config.backupDir, {
      secondaryDir: settings.secondaryDir,
      keep: settings.keep,
      reason,
    });
    lastBackupError = result.errors[0] ? `${result.errors[0].dir}: ${result.errors[0].message}` : null;
  } catch (err) {
    lastBackupError = (err as Error).message;
    if (reason === 'manual' || reason === 'before-restore') throw err;
  }
}

function scheduleBackups(): void {
  if (backupTimer) clearInterval(backupTimer);
  if (!db) return;
  const hours = getBackupSettings(db).intervalHours;
  backupTimer = setInterval(() => runBackup('auto'), hours * 60 * 60 * 1000);
}

function backupStatus(): BackupStatus {
  if (!db || !config) throw new Error('Database not initialized');
  const settings = getBackupSettings(db);
  let secondaryBackups: BackupStatus['secondaryBackups'] = [];
  try {
    secondaryBackups = settings.secondaryDir ? listBackups(settings.secondaryDir) : [];
  } catch {
    secondaryBackups = [];
  }
  return {
    primaryDir: config.backupDir,
    backups: listBackups(config.backupDir),
    secondaryBackups,
    lastError: lastBackupError,
  };
}

/**
 * Replace the live database with a backup. The candidate is verified first,
 * and the current database is itself backed up ('before-restore') so a
 * restore can always be undone. The restored file is then migrated forward.
 */
function restoreFrom(filePath: string): void {
  if (!db || !config) throw new Error('Database not initialized');
  verifyBackup(filePath);
  runBackup('before-restore');
  db.close();
  db = null;
  for (const suffix of ['-wal', '-shm']) fs.rmSync(config.databasePath + suffix, { force: true });
  fs.copyFileSync(filePath, config.databasePath);
  openAndMigrate(config);
  scheduleBackups();
}

function shutdown(): void {
  if (backupTimer) clearInterval(backupTimer);
  if (!db) return;
  runBackup('close');
  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } finally {
    db.close();
    db = null;
  }
}

const importModeSchema = z.enum(['add', 'update', 'upsert']);
const idSchema = z.number().int().positive();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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

/** The record as it was before an update — kept in the audit log next to the new values. */
function captureBefore(conn: Db, req: DbRequestEnvelope['request']): unknown {
  switch (req.kind) {
    case 'items.update':
      return { ...getItem(conn, req.id), units: getItemUnits(conn, req.id) };
    case 'customers.update':
      return getCustomer(conn, req.id);
    case 'suppliers.update':
      return getSupplier(conn, req.id);
    case 'settings.update':
      return getSettings(conn);
    default:
      return undefined;
  }
}

function dispatch(envelope: DbRequestEnvelope): DbResponseEnvelope {
  const req = envelope.request;
  let before: unknown;
  const ok = (data: unknown): DbResponseEnvelope => {
    // Audit is written after the operation succeeded; a failed write is not
    // logged as having happened.
    if (db) auditRequest(db, req, data, before);
    return { id: envelope.id, ok: true, data };
  };

  try {
    // Every id that names a row is validated at the boundary, like every input.
    if ('id' in req && req.id !== undefined) idSchema.parse(req.id);
    if (req.kind !== 'ping' && req.kind !== 'migrate') before = captureBefore(requireDb(), req);
    // One pharmacy, no user accounts (decision D18): every write is made and
    // approved by the single built-in operator, and recorded in the audit log.
    const userId = OPERATOR_ID;

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
        updateItem(requireDb(), req.id, itemInputSchema.parse(req.input), userId);
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
        const mode = importModeSchema.parse(req.mode ?? 'add');
        const { headers, rows } = readSheet(req.filePath);
        const mapping = (req.mapping ?? guessMapping(headers)) as Partial<
          Record<ImportField, number>
        >;
        // Rows naming an existing item are matched (planImport), not rejected:
        // "add" skips them, the other modes update them. Only duplicates
        // inside the file itself are rejected.
        const { accepted, rejected } = validateRows(rows, mapping, {});
        const plan = planImport(conn, accepted, mode);
        return ok({
          filePath: req.filePath,
          mode,
          headers,
          mapping,
          totalRows: rows.length,
          acceptedCount: plan.toInsert.length + plan.toUpdate.length,
          newCount: plan.toInsert.length,
          existingCount: plan.toUpdate.length,
          sample: [...plan.toInsert, ...plan.toUpdate.map((u) => u.row)].slice(0, 20),
          // Cap what crosses the boundary: a wholly mismatched mapping can
          // reject all 35,000 rows, and serialising those would stall the UI.
          rejected: rejected.slice(0, 200),
          skippedCount: plan.skipped,
        });
      }

      case 'import.apply': {
        const conn = requireDb();
        const mode = importModeSchema.parse(req.mode ?? 'add');
        const { rows } = readSheet(req.filePath);
        const mapping = req.mapping as Partial<Record<ImportField, number>>;
        const { accepted, rejected } = validateRows(rows, mapping, {});
        const plan = planImport(conn, accepted, mode);
        const total = plan.toInsert.length + plan.toUpdate.length;
        const progress = (offset: number) => (p: { done: number }) =>
          process.parentPort.postMessage({ type: 'progress', channel: 'import', data: { done: offset + p.done, total } });

        const started = Date.now();
        const inserted = plan.toInsert.length ? bulkInsertItems(conn, plan.toInsert, progress(0)).inserted : 0;
        const upd = plan.toUpdate.length
          ? updateImportedItems(conn, plan.toUpdate, { minStock: mapping.minStock !== undefined }, progress(inserted))
          : { updated: 0, unitsMismatch: 0 };

        return ok({
          inserted,
          updated: upd.updated,
          skipped: plan.skipped,
          unitsMismatch: upd.unitsMismatch,
          rejectedCount: rejected.length,
          elapsedMs: Date.now() - started,
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

      case 'suppliers.recordPayment': {
        const p = supplierPaymentSchema.parse({ id: req.id, amount: req.amount, note: req.note });
        recordSupplierPayment(requireDb(), p.id, p.amount, p.note);
        return ok(undefined);
      }

      case 'suppliers.ledger':
        return ok(getSupplierLedger(requireDb(), req.id, req.limit));

      case 'purchases.create':
        return ok(createPurchaseInvoice(requireDb(), purchaseInvoiceInputSchema.parse(req.input), userId));

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
        confirmPurchaseInvoice(requireDb(), req.id, userId);
        return ok(undefined);

      case 'purchases.void':
        voidPurchaseInvoice(requireDb(), req.id);
        return ok(undefined);

      case 'stock.search':
        return ok(searchItemStock(requireDb(), req.query, req.limit, req.warehouseId, req.inStockOnly === true));

      case 'stock.batches':
        return ok(getItemBatches(requireDb(), req.itemId));

      case 'stock.sellableBatches':
        return ok(getSellableBatches(requireDb(), req.itemId, req.warehouseId));

      case 'stock.batchMoves':
        return ok(getBatchMoves(requireDb(), req.batchId));

      case 'stock.lowStock':
        return ok(getLowStockItems(requireDb(), req.limit));

      case 'stock.expiryReport':
        return ok(getExpiryReport(requireDb(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.asOf)));

      case 'adjustments.create':
        return ok(
          createStockAdjustment(
            requireDb(),
            { ...stockAdjustmentInputSchema.parse(req.input), approvedBy: userId },
            userId
          )
        );

      case 'adjustments.list':
        return ok(listStockAdjustments(requireDb(), req.limit));

      case 'adjustments.moves':
        return ok(getStockAdjustmentMoves(requireDb(), req.id));

      case 'adjustments.writeOffExpired':
        return ok(writeOffExpired(requireDb(), req.warehouseId, userId));

      case 'sales.create':
        return ok(createSalesInvoice(requireDb(), salesInvoiceInputSchema.parse(req.input), userId));

      case 'sales.checkout':
        return ok(checkoutSalesInvoice(requireDb(), salesInvoiceInputSchema.parse(req.input), userId));

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
        confirmSalesInvoice(requireDb(), req.id, userId);
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

      case 'shifts.open': {
        const p = openShiftSchema.parse({ warehouseId: req.warehouseId, openingFloat: req.openingFloat });
        return ok(openShift(requireDb(), p.warehouseId, p.openingFloat, userId));
      }

      case 'shifts.close':
        closeShift(requireDb(), req.id, closeShiftSchema.parse(req.input));
        return ok(undefined);

      case 'shifts.computeExpectedCash':
        return ok(computeExpectedCash(requireDb(), req.id));

      case 'shifts.recordCash': {
        const p = cashTransactionSchema.parse(req);
        return ok(recordCashTransaction(requireDb(), p.shiftId, p.direction, p.amount, p.category, p.note, userId));
      }

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

      case 'customers.recordPayment': {
        const p = customerPaymentSchema.parse({ id: req.id, amount: req.amount, note: req.note, cash: req.cash });
        recordCustomerPayment(requireDb(), p.id, p.amount, p.note, { cash: p.cash, userId });
        return ok(undefined);
      }

      case 'customers.receivablesSummary':
        return ok(getReceivablesSummary(requireDb()));

      case 'salesReturns.create':
      {
        const input = salesReturnInputSchema.parse(req.input);
        return ok(
          createSalesReturn(requireDb(), { ...input, approvedBy: input.sourceInvoiceId ? null : userId }, userId)
        );
      }

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
        return ok(createPurchaseReturn(requireDb(), purchaseReturnInputSchema.parse(req.input), userId));

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

      case 'audit.list':
        return ok(listAudit(requireDb(), { from: req.from, to: req.to, entity: req.entity, limit: req.limit }));

      // ---------------- narcotics ----------------
      case 'narcotics.register':
        return ok(listNarcoticsRegister(requireDb(), { itemId: req.itemId, from: req.from, to: req.to, limit: req.limit }));

      case 'narcotics.reconciliation':
        return ok(narcoticsReconciliation(requireDb()));

      case 'narcotics.fix':
        return ok(
          fixNarcoticsEntry(
            requireDb(),
            req.id,
            prescriptionSchema.parse(req.details),
            z.string().trim().min(1).max(300).parse(req.reason),
            userId,
            userId
          )
        );

      case 'sales.prescription':
        return ok(getInvoicePrescription(requireDb(), req.id) ?? null);

      // ---------------- till ----------------
      case 'sales.hold':
        return ok(holdSalesInvoice(requireDb(), salesInvoiceInputSchema.parse(req.input), userId));

      case 'sales.held':
        return ok(listHeldInvoices(requireDb(), idSchema.parse(req.warehouseId)));

      case 'sales.resume':
        return ok(resumeHeldInvoice(requireDb(), req.id));

      case 'sales.search':
        return ok(
          searchSalesInvoices(requireDb(), {
            from: req.from,
            to: req.to,
            serial: req.serial,
            status: req.status,
            limit: req.limit,
          })
        );

      case 'documents.get':
        return ok(
          getPrintableDocument(
            requireDb(),
            z.enum(['sale', 'purchase', 'salesReturn', 'purchaseReturn']).parse(req.doc),
            idSchema.parse(req.id)
          )
        );

      case 'sales.receipt':
        return ok({
          receipt: getReceiptData(requireDb(), req.id),
          pharmacy: getPharmacyProfile(requireDb()),
          printer: getPrinterSettings(requireDb()),
        });

      case 'items.alternatives':
        return ok(findAlternatives(requireDb(), req.id, idSchema.parse(req.warehouseId)));

      case 'stock.valuation':
        return ok(getStockValuation(requireDb(), req.warehouseId ? idSchema.parse(req.warehouseId) : null));

      case 'stock.opening': {
        const input = openingStockSchema.parse(req.input);
        return ok(postOpeningStock(requireDb(), input.warehouseId, input.lines, userId));
      }

      case 'shortages.list':
        return ok(listShortages(requireDb(), z.enum(['active', 'closed', 'all']).parse(req.scope ?? 'active')));

      case 'shortages.activeItems':
        return ok(activeShortageItemIds(requireDb()));

      case 'shortages.add':
        return ok(addShortage(requireDb(), shortageInputSchema.parse(req.input)));

      case 'shortages.update':
        updateShortage(requireDb(), req.id, shortageUpdateSchema.parse(req.input));
        return ok(undefined);

      case 'shortages.setStatus':
        setShortageStatus(requireDb(), req.id, shortageStatusSchema.parse(req.status));
        return ok(undefined);

      case 'items.export':
        return ok(exportItemsSheet(requireDb()));

      case 'items.unitPriceIssues':
        return ok(unitPriceIssues(requireDb()));

      case 'items.fixUnitPrices':
        return ok(fixUnitPrices(requireDb(), z.array(idSchema).min(1).parse(req.itemIds), userId));

      // ---------------- insurance ----------------
      case 'insurance.companies':
        return ok(listInsuranceCompanies(requireDb(), req.includeInactive));

      case 'insurance.createCompany':
        return ok(createInsuranceCompany(requireDb(), insuranceCompanyInputSchema.parse(req.input)));

      case 'insurance.updateCompany':
        updateInsuranceCompany(requireDb(), req.id, insuranceCompanyInputSchema.parse(req.input));
        return ok(undefined);

      case 'insurance.setCompanyActive':
        setInsuranceCompanyActive(requireDb(), req.id, z.boolean().parse(req.active));
        return ok(undefined);

      case 'insurance.exclusions':
        return ok(listExclusions(requireDb(), req.id));

      case 'insurance.setExclusion':
        setExclusion(requireDb(), req.id, idSchema.parse(req.itemId), z.boolean().parse(req.excluded));
        return ok(undefined);

      case 'insurance.unclaimed':
        return ok(unclaimedInvoices(requireDb(), idSchema.parse(req.companyId), isoDate.parse(req.from), isoDate.parse(req.to)));

      case 'insurance.createClaim':
        return ok(createClaim(requireDb(), idSchema.parse(req.companyId), isoDate.parse(req.from), isoDate.parse(req.to), userId));

      case 'insurance.claims':
        return ok(listClaims(requireDb(), req.companyId));

      case 'insurance.claimLines':
        return ok(getClaimLines(requireDb(), req.id));

      case 'insurance.submitClaim':
        submitClaim(requireDb(), req.id);
        return ok(undefined);

      case 'insurance.settleClaim':
        settleClaim(requireDb(), req.id, claimSettlementSchema.parse(req.input));
        return ok(undefined);

      case 'insurance.receivables':
        return ok(insuranceReceivables(requireDb()));

      case 'settings.get':
        return ok(getSettings(requireDb()));

      case 'settings.update': {
        const updated = updateSettings(requireDb(), pharmacySettingsInputSchema.parse(req.input));
        if (req.input.backup?.intervalHours !== undefined) scheduleBackups();
        return ok(updated);
      }

      case 'backup.status':
        return ok(backupStatus());

      case 'backup.run':
        runBackup('manual');
        return ok(backupStatus());

      case 'backup.restore': {
        const file = z.string().min(1).parse(req.filePath);
        restoreFrom(file);
        return ok(true);
      }

      // Handled in the main process, which owns the window and the filesystem.
      // Listed so the exhaustiveness check below stays meaningful.
      case 'import.pickFile':
      case 'import.saveRejects':
      case 'backup.pickFolder':
      case 'print.receipt':
      case 'print.test':
      case 'print.status':
      case 'print.retryFailed':
      case 'print.openDrawer':
      case 'print.listPrinters':
      case 'print.document':
      case 'file.saveCsv':
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
    return toErrorEnvelope(envelope.id, err);
  }
}

/**
 * Every failure crosses the boundary with a code the renderer can translate:
 * DomainErrors keep theirs, zod failures become 'validation', and anything
 * else is 'internal' with the English text kept for diagnostics.
 */
function toErrorEnvelope(id: number, err: unknown): DbResponseEnvelope {
  let code = 'internal';
  let params: Record<string, string | number | null> = {};
  let message = (err as Error)?.message ?? String(err);
  if (err instanceof DomainError) {
    code = err.code;
    params = err.params;
  } else if (err instanceof z.ZodError) {
    code = 'validation';
    const issue = err.issues[0];
    params = { field: issue ? issue.path.join('.') : '' };
    message = issue ? `${issue.path.join('.')}: ${issue.message}` : message;
  } else if (/immutable:/.test(message)) {
    code = 'immutable';
  }
  const error = encodeAppError({ code, params, message });
  return { id, ok: false, error, code, params };
}

process.parentPort.on('message', (message) => {
  const payload = message.data as
    | { type: 'init'; config: Config }
    | { type: 'shutdown' }
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

  if (payload.type === 'shutdown') {
    try {
      shutdown();
    } finally {
      process.parentPort.postMessage({ type: 'shutdown-done' });
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
