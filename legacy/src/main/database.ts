/**
 * Database management using better-sqlite3
 */

import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import type { Item, Batch, Invoice, Customer, User } from '../types';

let db: Database.Database | null = null;

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'pharmacy.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  createTables();
}

function createTables(): void {
  if (!db) throw new Error('Database not initialized');

  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nameAr TEXT NOT NULL,
      category TEXT,
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS barcodes (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      FOREIGN KEY(itemId) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      batchNumber TEXT,
      expiryDate TEXT,
      quantity INTEGER DEFAULT 0,
      costPrice INTEGER,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(itemId) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      serial INTEGER UNIQUE,
      type TEXT CHECK(type IN ('cash', 'credit', 'return')),
      dateTime TEXT,
      cashierId TEXT,
      customerId TEXT,
      subtotal INTEGER,
      discount INTEGER DEFAULT 0,
      total INTEGER,
      paid INTEGER,
      change INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(cashierId) REFERENCES users(id),
      FOREIGN KEY(customerId) REFERENCES customers(id)
    );

    CREATE TABLE IF NOT EXISTS invoiceLines (
      id TEXT PRIMARY KEY,
      invoiceId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      batchId TEXT,
      qty INTEGER,
      unitPrice INTEGER,
      total INTEGER,
      FOREIGN KEY(invoiceId) REFERENCES invoices(id),
      FOREIGN KEY(itemId) REFERENCES items(id),
      FOREIGN KEY(batchId) REFERENCES batches(id)
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      address TEXT,
      creditLimit INTEGER DEFAULT 0,
      outstanding INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      fullName TEXT,
      role TEXT DEFAULT 'cashier',
      active INTEGER DEFAULT 1,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_barcode ON barcodes(barcode);
    CREATE INDEX IF NOT EXISTS idx_itemId ON batches(itemId);
    CREATE INDEX IF NOT EXISTS idx_invoiceSerial ON invoices(serial);
    CREATE INDEX IF NOT EXISTS idx_invoiceDate ON invoices(dateTime);
  `);
}

export function getItem(id: string): Item | undefined {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(`
    SELECT items.id, items.name, items.nameAr, items.category,
           GROUP_CONCAT(barcodes.barcode) as barcodes
    FROM items
    LEFT JOIN barcodes ON items.id = barcodes.itemId
    WHERE items.id = ?
    GROUP BY items.id
  `);
  const row = stmt.get(id) as any;
  return row ? { ...row, barcode: row.barcodes?.split(',') || [] } : undefined;
}

export function getItemByBarcode(barcode: string): Item | undefined {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(`
    SELECT items.id, items.name, items.nameAr, items.category,
           GROUP_CONCAT(barcodes.barcode) as barcodes
    FROM items
    LEFT JOIN barcodes ON items.id = barcodes.itemId
    WHERE barcodes.barcode = ?
    GROUP BY items.id
  `);
  const row = stmt.get(barcode) as any;
  return row ? { ...row, barcode: row.barcodes?.split(',') || [] } : undefined;
}

export function getAllItems(): Item[] {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(`
    SELECT items.id, items.name, items.nameAr, items.category,
           GROUP_CONCAT(barcodes.barcode) as barcodes,
           SUM(batches.quantity) as quantity
    FROM items
    LEFT JOIN barcodes ON items.id = barcodes.itemId
    LEFT JOIN batches ON items.id = batches.itemId
    WHERE items.active = 1
    GROUP BY items.id
  `);
  return stmt.all() as any[];
}

export function createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'>): string {
  if (!db) throw new Error('Database not initialized');
  const id = `INV-${Date.now()}`;
  const stmt = db.prepare(`
    INSERT INTO invoices (id, serial, type, dateTime, cashierId, customerId, subtotal, discount, total, paid, change, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    invoice.serial,
    invoice.type,
    invoice.dateTime,
    invoice.cashier,
    invoice.customerName,
    invoice.subtotal,
    invoice.discount,
    invoice.total,
    invoice.paid,
    invoice.change,
    invoice.status,
    invoice.notes
  );

  // Insert lines
  const lineStmt = db.prepare(`
    INSERT INTO invoiceLines (id, invoiceId, itemId, batchId, qty, unitPrice, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const line of invoice.lines) {
    lineStmt.run(
      `LINE-${Date.now()}-${Math.random()}`,
      id,
      line.itemId,
      line.batchId || null,
      line.qty,
      line.unitPrice,
      line.total
    );
  }

  return id;
}

export function getInvoice(id: string): Invoice | undefined {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare('SELECT * FROM invoices WHERE id = ?');
  const invoice = stmt.get(id) as any;
  if (!invoice) return undefined;

  const lineStmt = db.prepare('SELECT * FROM invoiceLines WHERE invoiceId = ?');
  const lines = lineStmt.all(id) as any[];

  return { ...invoice, lines };
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
