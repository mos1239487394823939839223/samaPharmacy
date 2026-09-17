import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem } from './items';
import { createSupplier, getSupplierBalance } from './suppliers';
import { getDefaultWarehouse } from './warehouses';
import {
  createPurchaseInvoice,
  confirmPurchaseInvoice,
  voidPurchaseInvoice,
  getPurchaseInvoice,
  getPurchaseInvoiceBySerial,
  getPurchaseLines,
  type PurchaseInvoiceInput,
} from './purchases';

let db: Db;
let itemId: number;
let supplierId: number;
let warehouseId: number;

beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));

  itemId = createItem(db, {
    nameAr: 'صنف للشراء',
    units: [{ nameAr: 'علبة', factor: 10, salePrice: 0, isBase: false, isDefaultSale: true }],
  });
  supplierId = createSupplier(db, { nameAr: 'مورد الاختبار' });
  warehouseId = getDefaultWarehouse(db).id;
});

function baseInvoice(overrides: Partial<PurchaseInvoiceInput> = {}): PurchaseInvoiceInput {
  return {
    supplierInvoiceNo: 'SUP-1',
    supplierId,
    warehouseId,
    purchaseType: 'credit',
    invoiceDate: '2026-01-01',
    lines: [
      {
        lineNo: 1,
        itemId,
        unitId: 1,
        qtyInUnit: 10,
        qtyBase: 100,
        unitPurchasePrice: 1000,
      },
    ],
    ...overrides,
  };
}

function batchesFor(itemId: number) {
  return db.prepare('SELECT * FROM batches WHERE item_id = ?').all(itemId) as Array<{
    id: number;
    qty_on_hand: number;
    unit_cost: number;
    batch_number: string | null;
    expiry_date: string | null;
  }>;
}

function movesFor(itemId: number) {
  return db.prepare('SELECT * FROM stock_moves WHERE item_id = ?').all(itemId) as Array<{
    qty_delta: number;
    unit_cost: number;
    move_type: string;
  }>;
}

describe('createPurchaseInvoice', () => {
  it('creates a draft invoice with computed line totals and no stock movement yet', () => {
    const id = createPurchaseInvoice(db, baseInvoice());
    const invoice = getPurchaseInvoice(db, id)!;
    expect(invoice.status).toBe('draft');
    expect(invoice.total).toBe(10000); // 10 * 1000
    expect(batchesFor(itemId)).toHaveLength(0);
  });

  it('assigns a sequential serial', () => {
    const a = createPurchaseInvoice(db, baseInvoice({ supplierInvoiceNo: 'A' }));
    const b = createPurchaseInvoice(db, baseInvoice({ supplierInvoiceNo: 'B' }));
    expect(getPurchaseInvoice(db, b)!.serial).toBe(getPurchaseInvoice(db, a)!.serial + 1);
  });

  it('computes ق.خ / ب.خ / ب.ض per the grid convention with a line discount', () => {
    const id = createPurchaseInvoice(
      db,
      baseInvoice({
        lines: [
          {
            lineNo: 1,
            itemId,
            unitId: 1,
            qtyInUnit: 10,
            qtyBase: 100,
            unitPurchasePrice: 1000,
            discountPct: 10,
          },
        ],
      })
    );
    const [line] = getPurchaseLines(db, id);
    expect(line!.valueBeforeDiscount).toBe(10000);
    expect(line!.discountAmt).toBe(1000);
    expect(line!.valueAfterDiscount).toBe(9000);
    expect(line!.valueAfterTax).toBe(9000); // no tax configured
  });
});

describe('confirmPurchaseInvoice', () => {
  it('creates a batch with the landed unit cost and writes a matching stock_moves row (rule 8)', () => {
    const id = createPurchaseInvoice(db, baseInvoice());
    confirmPurchaseInvoice(db, id);

    const batches = batchesFor(itemId);
    expect(batches).toHaveLength(1);
    expect(batches[0]!.qty_on_hand).toBe(100);
    expect(batches[0]!.unit_cost).toBe(100); // 10000 / 100 base units

    const moves = movesFor(itemId);
    expect(moves).toHaveLength(1);
    expect(moves[0]!.qty_delta).toBe(100);
    expect(moves[0]!.unit_cost).toBe(100);
    expect(moves[0]!.move_type).toBe('purchase');
  });

  it('writes the stock_moves qty_delta as the full total including bonus (rule 8)', () => {
    // The ledger must be rebuildable to the batch quantity. If qty_delta only
    // counted paid units, summing stock_moves for this item would never
    // reach the batch's actual qty_on_hand once bonus stock is involved.
    const id = createPurchaseInvoice(
      db,
      baseInvoice({
        lines: [
          {
            lineNo: 1,
            itemId,
            unitId: 1,
            qtyInUnit: 10,
            qtyBase: 100,
            bonusInUnit: 10,
            bonusBase: 100,
            unitPurchasePrice: 1000,
          },
        ],
      })
    );
    confirmPurchaseInvoice(db, id);

    const [batch] = batchesFor(itemId);
    const moves = movesFor(itemId);
    const movedTotal = moves.reduce((sum, m) => sum + m.qty_delta, 0);
    expect(movedTotal).toBe(batch!.qty_on_hand);
    expect(moves[0]!.qty_delta).toBe(200);
  });

  it('folds bonus quantity into the batch and lowers unit cost (BR-9)', () => {
    const id = createPurchaseInvoice(
      db,
      baseInvoice({
        lines: [
          {
            lineNo: 1,
            itemId,
            unitId: 1,
            qtyInUnit: 10,
            qtyBase: 100,
            bonusInUnit: 10,
            bonusBase: 100,
            unitPurchasePrice: 1000,
          },
        ],
      })
    );
    confirmPurchaseInvoice(db, id);

    const [batch] = batchesFor(itemId);
    expect(batch!.qty_on_hand).toBe(200); // 100 paid + 100 bonus
    expect(batch!.unit_cost).toBe(50); // 10000 / 200
  });

  it('allocates header expenses and discount into the landed cost', () => {
    const id = createPurchaseInvoice(
      db,
      baseInvoice({ expenses: 1000, extraDiscountAmt: 500 })
    );
    confirmPurchaseInvoice(db, id);
    const [batch] = batchesFor(itemId);
    // (10000 + 1000 - 500) / 100 = 105
    expect(batch!.unit_cost).toBe(105);
  });

  it('BR-11: a repeat receipt with the same batch/expiry/cost merges into the existing batch', () => {
    const id1 = createPurchaseInvoice(db, baseInvoice({ supplierInvoiceNo: 'FIRST' }));
    confirmPurchaseInvoice(db, id1);

    const id2 = createPurchaseInvoice(db, baseInvoice({ supplierInvoiceNo: 'SECOND' }));
    confirmPurchaseInvoice(db, id2);

    const batches = batchesFor(itemId);
    expect(batches).toHaveLength(1);
    expect(batches[0]!.qty_on_hand).toBe(200); // 100 + 100 merged

    // Two receipts, two moves, against the same batch.
    expect(movesFor(itemId)).toHaveLength(2);
  });

  it('a different cost creates a distinct batch rather than merging at the wrong cost', () => {
    const id1 = createPurchaseInvoice(db, baseInvoice({ supplierInvoiceNo: 'A' }));
    confirmPurchaseInvoice(db, id1);

    const id2 = createPurchaseInvoice(
      db,
      baseInvoice({
        supplierInvoiceNo: 'B',
        lines: [
          { lineNo: 1, itemId, unitId: 1, qtyInUnit: 10, qtyBase: 100, unitPurchasePrice: 2000 },
        ],
      })
    );
    confirmPurchaseInvoice(db, id2);

    expect(batchesFor(itemId)).toHaveLength(2);
  });

  it('posts the invoice total to the supplier ledger', () => {
    const before = getSupplierBalance(db, supplierId);
    const id = createPurchaseInvoice(db, baseInvoice());
    confirmPurchaseInvoice(db, id);
    expect(getSupplierBalance(db, supplierId)).toBe(before + 10000);
  });

  it('posts total, not subtotal, when tax and header discount make them differ', () => {
    // subtotal and total happen to be equal in every other test here because
    // there is no tax and no header discount, which would silently hide a
    // bug that posts subtotal to the ledger instead of total.
    const before = getSupplierBalance(db, supplierId);
    const id = createPurchaseInvoice(
      db,
      baseInvoice({
        extraDiscountAmt: 500,
        lines: [
          {
            lineNo: 1,
            itemId,
            unitId: 1,
            qtyInUnit: 10,
            qtyBase: 100,
            unitPurchasePrice: 1000,
            taxPct: 14,
          },
        ],
      })
    );
    const invoice = getPurchaseInvoice(db, id)!;
    expect(invoice.total).not.toBe(invoice.subtotal);

    confirmPurchaseInvoice(db, id);
    expect(getSupplierBalance(db, supplierId)).toBe(before + invoice.total);
  });

  it('marks the invoice confirmed with a timestamp', () => {
    const id = createPurchaseInvoice(db, baseInvoice());
    confirmPurchaseInvoice(db, id);
    const invoice = getPurchaseInvoice(db, id)!;
    expect(invoice.status).toBe('confirmed');
    expect(invoice.confirmedAt).not.toBeNull();
  });

  it('refuses to confirm the same invoice twice', () => {
    const id = createPurchaseInvoice(db, baseInvoice());
    confirmPurchaseInvoice(db, id);
    expect(() => confirmPurchaseInvoice(db, id)).toThrow(/status "confirmed"/);
  });

  it('refuses to confirm a nonexistent invoice', () => {
    expect(() => confirmPurchaseInvoice(db, 999999)).toThrow(/not found/);
  });

  it('rolls back everything if confirmation fails partway', () => {
    // createPurchaseInvoice itself rejects a bad item_id via the schema's own
    // foreign key at insert time, so that cannot be used to force a failure
    // inside confirm. Instead corrupt the row after creation: point the
    // second line's item_id at nothing via a raw update, bypassing the
    // repository so confirmPurchaseInvoice is the one that hits the FK
    // violation partway through its loop, after line 1 has already written
    // a batch, a stock move, and had landed_unit_cost set.
    const id = createPurchaseInvoice(db, {
      ...baseInvoice(),
      lines: [
        { lineNo: 1, itemId, unitId: 1, qtyInUnit: 10, qtyBase: 100, unitPurchasePrice: 1000 },
        { lineNo: 2, itemId, unitId: 1, qtyInUnit: 5, qtyBase: 50, unitPurchasePrice: 500 },
      ],
    });
    db.pragma('foreign_keys = OFF');
    db.prepare(
      'UPDATE purchase_invoice_lines SET item_id = 999999 WHERE invoice_id = ? AND line_no = 2'
    ).run(id);
    db.pragma('foreign_keys = ON');

    expect(() => confirmPurchaseInvoice(db, id)).toThrow();

    // No batch, no stock move, no ledger entry, and the invoice is still a
    // draft -- even though line 1 was valid and would have committed cleanly
    // on its own.
    expect(batchesFor(itemId)).toHaveLength(0);
    expect(movesFor(itemId)).toHaveLength(0);
    expect(getSupplierBalance(db, supplierId)).toBe(0);
    expect(getPurchaseInvoice(db, id)!.status).toBe('draft');
  });

  it('multi-line invoice: each line lands its own cost and its own batch', () => {
    const itemId2 = createItem(db, { nameAr: 'صنف ثانٍ للشراء' });
    const id = createPurchaseInvoice(db, {
      ...baseInvoice(),
      lines: [
        { lineNo: 1, itemId, unitId: 1, qtyInUnit: 10, qtyBase: 100, unitPurchasePrice: 1000 },
        { lineNo: 2, itemId: itemId2, unitId: 1, qtyInUnit: 5, qtyBase: 50, unitPurchasePrice: 2000 },
      ],
      expenses: 300,
    });
    confirmPurchaseInvoice(db, id);

    const [b1] = batchesFor(itemId);
    const [b2] = batchesFor(itemId2);
    // Weights: 10000 and 10000 (5*2000) -> expenses split 150/150.
    expect(b1!.unit_cost).toBe(101); // (10000+150)/100 = 101.5 -> truncated 101
    expect(b2!.unit_cost).toBe(203); // (10000+150)/50 = 203
  });
});

describe('getPurchaseInvoiceBySerial', () => {
  it('finds an invoice by its serial regardless of how many newer invoices exist', () => {
    const target = createPurchaseInvoice(db, baseInvoice());
    const targetSerial = getPurchaseInvoice(db, target)!.serial;

    for (let i = 0; i < 10; i++) {
      createPurchaseInvoice(db, baseInvoice({ supplierInvoiceNo: `SUP-${i + 2}` }));
    }

    const found = getPurchaseInvoiceBySerial(db, targetSerial);
    expect(found?.id).toBe(target);
  });

  it('returns undefined for a serial that does not exist', () => {
    expect(getPurchaseInvoiceBySerial(db, 999999)).toBeUndefined();
  });
});

describe('voidPurchaseInvoice', () => {
  it('voids a draft invoice', () => {
    const id = createPurchaseInvoice(db, baseInvoice());
    voidPurchaseInvoice(db, id);
    expect(getPurchaseInvoice(db, id)!.status).toBe('voided');
  });

  it('refuses to void a confirmed invoice directly (rule 9 — use a return instead)', () => {
    const id = createPurchaseInvoice(db, baseInvoice());
    confirmPurchaseInvoice(db, id);
    expect(() => voidPurchaseInvoice(db, id)).toThrow(/purchase return/);
  });
});
