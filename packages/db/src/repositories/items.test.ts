/**
 * M1 acceptance: insert 1,000 items and retrieve one by normalized Arabic
 * name, by English name, and by barcode.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import {
  createItem,
  updateItem,
  getItem,
  getItemBarcodes,
  getItemUnits,
  findByBarcode,
  searchItems,
  countItems,
  deactivateItem,
  nextSequence,
} from './items';
import { createSupplier } from './suppliers';
import { getDefaultWarehouse } from './warehouses';
import { createPurchaseInvoice, confirmPurchaseInvoice } from './purchases';
import { createSalesInvoice } from './sales';
import { migrate } from '../migrate';

let db: Db;

const MIGRATION = join(__dirname, '../../migrations/0001-initial-schema.sql');

beforeAll(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  db.exec(readFileSync(MIGRATION, 'utf8'));
});

afterAll(() => db.close());

/** A separate, fully-migrated db (0001 + later migrations, incl. the seed
    system user purchases/sales need for user_id) — the shared `db` above
    only runs 0001 directly, which is enough for the item-only tests around
    it but not for the purchase/sale flow the FK-regression tests below
    need to set up. Isolated per test so it can't affect the shared one's
    sequence counters or row ids. */
function freshMigratedDb(): Db {
  const fresh = new Database(':memory:') as Db;
  fresh.pragma('foreign_keys = ON');
  migrate(fresh, join(__dirname, '../../migrations'));
  return fresh;
}

describe('sequences', () => {
  it('increments and does not reissue a value', () => {
    const a = nextSequence(db, 'customer_code');
    const b = nextSequence(db, 'customer_code');
    expect(b).toBe(a + 1);
  });

  it('throws on an unknown sequence rather than silently returning 0', () => {
    expect(() => nextSequence(db, 'nope')).toThrow(/Unknown sequence/);
  });
});

describe('createItem', () => {
  it('stores an item with barcodes, units and groups', () => {
    const id = createItem(db, {
      nameAr: 'أوجمنتين ١ جم',
      nameEn: 'Augmentin 1g',
      scientificName: 'Amoxicillin + Clavulanic acid',
      publicPrice: 12500,
      shelfLocation: 'A-3',
      barcodes: ['6221048123456', '04567'],
      units: [
        { nameAr: 'قرص', factor: 1, salePrice: 1040, isBase: true },
        { nameAr: 'علبة', factor: 12, salePrice: 12500, isBase: false, isDefaultSale: true },
      ],
    });

    const item = getItem(db, id);
    expect(item?.nameAr).toBe('أوجمنتين ١ جم');
    expect(item?.publicPrice).toBe(12500);
    expect(getItemBarcodes(db, id)).toEqual(['6221048123456', '04567']);
    expect(getItemUnits(db, id)).toHaveLength(2);
  });

  it('assigns sequential codes from the sequences table', () => {
    const a = createItem(db, { nameAr: 'صنف أ' });
    const b = createItem(db, { nameAr: 'صنف ب' });
    expect(getItem(db, b)!.code).toBe(getItem(db, a)!.code + 1);
  });

  it('preserves leading zeros on barcodes', () => {
    // Parsed as a number, 04567 becomes 4567 and never matches again.
    const id = createItem(db, { nameAr: 'صنف بباركود صفري', barcodes: ['0001234'] });
    expect(getItemBarcodes(db, id)).toEqual(['0001234']);
    expect(findByBarcode(db, '0001234')?.id).toBe(id);
    expect(findByBarcode(db, '1234')).toBeUndefined();
  });

  it('rolls back the whole item when a barcode collides', () => {
    const before = countItems(db);
    expect(() =>
      createItem(db, { nameAr: 'مكرر', barcodes: ['6221048123456'] })
    ).toThrow();
    // No orphaned item row, and the transaction rolled back cleanly.
    expect(countItems(db)).toBe(before);
  });
});

describe('normalized search', () => {
  it('finds an item typed without hamza — the blueprint §2.6 case', () => {
    createItem(db, { nameAr: 'أدول إكسترا', nameEn: 'Adol Extra' });
    const hits = searchItems(db, 'ادول');
    expect(hits.some((h) => h.nameAr === 'أدول إكسترا')).toBe(true);
  });

  it('finds an item typed with Arabic-Indic digits', () => {
    createItem(db, { nameAr: 'باراسيتامول 500' });
    expect(searchItems(db, '٥٠٠').some((h) => h.nameAr === 'باراسيتامول 500')).toBe(true);
  });

  it('finds by English name', () => {
    createItem(db, { nameAr: 'هيبتا بانثينول', nameEn: 'Hepta Panthenol' });
    expect(searchItems(db, 'hepta').some((h) => h.nameEn === 'Hepta Panthenol')).toBe(true);
  });

  it('finds by active ingredient', () => {
    createItem(db, {
      nameAr: 'بريفاكوند',
      scientificName: 'Dexamethasone',
    });
    expect(searchItems(db, 'dexamethasone').some((h) => h.nameAr === 'بريفاكوند')).toBe(true);
  });

  it('returns nothing for an empty query instead of every row', () => {
    expect(searchItems(db, '   ')).toEqual([]);
  });
});

describe('updateItem', () => {
  it('refreshes the normalized columns when the name changes', () => {
    const id = createItem(db, { nameAr: 'اسم قديم' });
    updateItem(db, id, { nameAr: 'أسم جديد' });
    expect(searchItems(db, 'اسم جديد').some((h) => h.id === id)).toBe(true);
  });

  it('replaces barcodes rather than accumulating them', () => {
    const id = createItem(db, { nameAr: 'صنف باركود', barcodes: ['111111'] });
    updateItem(db, id, { nameAr: 'صنف باركود', barcodes: ['222222'] });
    expect(getItemBarcodes(db, id)).toEqual(['222222']);
    expect(findByBarcode(db, '111111')).toBeUndefined();
  });

  it('saves a price change on an item that has already been sold, without a foreign key error', () => {
    // Reproduces a real bug: replaceUnits used to DELETE + re-INSERT
    // item_units on every save. Once an item had a confirmed sales line
    // pointing at that unit's id, the DELETE violated the NOT NULL foreign
    // key on sales_invoice_lines.unit_id and the whole save failed with
    // "FOREIGN KEY constraint failed" — for something as ordinary as
    // editing the selling price.
    const fresh = freshMigratedDb();
    try {
      const id = createItem(fresh, {
        nameAr: 'صنف تم بيعه',
        units: [{ nameAr: 'قرص', factor: 1, salePrice: 500, isBase: true, isDefaultSale: true }],
      });
      const [unit] = getItemUnits(fresh, id) as { id: number }[];

      const supplierId = createSupplier(fresh, { nameAr: 'مورد لصنف مباع' });
      const warehouseId = getDefaultWarehouse(fresh).id;
      const purchaseId = createPurchaseInvoice(fresh, {
        supplierInvoiceNo: `SUP-${Math.random()}`,
        supplierId,
        warehouseId,
        purchaseType: 'credit',
        invoiceDate: '2026-01-01',
        lines: [
          { lineNo: 1, itemId: id, unitId: unit!.id, qtyInUnit: 10, qtyBase: 10, unitPurchasePrice: 300 },
        ],
      });
      confirmPurchaseInvoice(fresh, purchaseId);

      createSalesInvoice(fresh, {
        warehouseId,
        invoiceType: 'cash',
        lines: [{ lineNo: 1, itemId: id, unitId: unit!.id, unitFactor: 1, qtyInUnit: 1, unitPrice: 500 }],
      });

      // The actual repro: changing only the selling price on an item that
      // now has a confirmed purchase and a draft sale referencing its unit.
      expect(() =>
        updateItem(fresh, id, {
          nameAr: 'صنف تم بيعه',
          units: [{ id: unit!.id, nameAr: 'قرص', factor: 1, salePrice: 600, isBase: true, isDefaultSale: true }],
        })
      ).not.toThrow();

      const [updatedUnit] = getItemUnits(fresh, id) as { id: number; salePrice: number }[];
      // Same row, not a new one — the id every historical line points to.
      expect(updatedUnit!.id).toBe(unit!.id);
      expect(updatedUnit!.salePrice).toBe(600);
    } finally {
      fresh.close();
    }
  });

  it('retires a removed unit instead of deleting it, so old lines stay valid', () => {
    const id = createItem(db, {
      nameAr: 'صنف بوحدتين',
      units: [
        { nameAr: 'قرص', factor: 1, salePrice: 100, isBase: true, isDefaultSale: true },
        { nameAr: 'علبة', factor: 10, salePrice: 900, isBase: false },
      ],
    });
    const [pill, box] = getItemUnits(db, id) as { id: number; nameAr: string }[];

    // Save again with only the "قرص" unit — "علبة" was removed in the form.
    updateItem(db, id, {
      nameAr: 'صنف بوحدتين',
      units: [{ id: pill!.id, nameAr: 'قرص', factor: 1, salePrice: 100, isBase: true, isDefaultSale: true }],
    });

    const allUnits = db
      .prepare('SELECT id, allow_sale AS allowSale FROM item_units WHERE item_id = ?')
      .all(id) as { id: number; allowSale: number }[];
    // Both rows still exist (rule 9) ...
    expect(allUnits.map((u) => u.id).sort()).toEqual([pill!.id, box!.id].sort());
    // ... but the dropped one can no longer be sold.
    expect(allUnits.find((u) => u.id === box!.id)!.allowSale).toBe(0);
    expect(allUnits.find((u) => u.id === pill!.id)!.allowSale).toBe(1);
  });
});

describe('deactivateItem', () => {
  it('hides the item from search without deleting it (rule 9)', () => {
    const id = createItem(db, { nameAr: 'صنف موقوف' });
    deactivateItem(db, id);
    expect(searchItems(db, 'صنف موقوف').some((h) => h.id === id)).toBe(false);
    expect(getItem(db, id)).toBeDefined();
    expect(getItem(db, id)!.isActive).toBe(0);
  });
});

describe('M1 acceptance: 1,000 items', () => {
  const NEEDLE_AR = 'زيثروماكس أقراص';
  const NEEDLE_EN = 'Zithromax Tablets';
  const NEEDLE_BARCODE = '6221099887766';

  beforeAll(() => {
    const insertMany = db.transaction(() => {
      for (let i = 0; i < 1000; i++) {
        createItem(db, {
          nameAr: `صنف تجريبي رقم ${i}`,
          nameEn: `Test Item ${i}`,
          barcodes: [`70000000${String(i).padStart(5, '0')}`],
          units: [{ nameAr: 'قرص', factor: 1, salePrice: 100 + i, isBase: true }],
        });
      }
      createItem(db, {
        nameAr: NEEDLE_AR,
        nameEn: NEEDLE_EN,
        scientificName: 'Azithromycin',
        barcodes: [NEEDLE_BARCODE],
      });
    });
    insertMany();
  });

  it('holds at least 1,000 items', () => {
    expect(countItems(db)).toBeGreaterThanOrEqual(1000);
  });

  it('retrieves by normalized Arabic name', () => {
    // Typed without the hamza on أ, as staff routinely do.
    const hits = searchItems(db, 'زيثروماكس اقراص');
    expect(hits.some((h) => h.nameAr === NEEDLE_AR)).toBe(true);
  });

  it('retrieves by English name', () => {
    expect(searchItems(db, 'zithromax').some((h) => h.nameEn === NEEDLE_EN)).toBe(true);
  });

  it('retrieves by barcode', () => {
    expect(findByBarcode(db, NEEDLE_BARCODE)?.nameAr).toBe(NEEDLE_AR);
  });

  it('answers a barcode lookup quickly', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) findByBarcode(db, NEEDLE_BARCODE);
    const perLookup = (performance.now() - start) / 100;
    expect(perLookup).toBeLessThan(5);
  });
});
