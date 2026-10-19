import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import type { Db } from '../connection';
import { migrate } from '../migrate';
import { createItem, findByBarcode, getItem, searchItems, updateItem } from './items';

let db: Db;
beforeEach(() => {
  db = new Database(':memory:') as Db;
  db.pragma('foreign_keys = ON');
  migrate(db, join(__dirname, '../../migrations'));
});

describe('international code (الكود الدولي)', () => {
  it('is saved, reloaded, and survives editing other fields', () => {
    const id = createItem(db, { nameAr: 'صنف', internationalCode: '6221234567890' });
    expect(getItem(db, id)!.internationalCode).toBe('6221234567890');
    updateItem(db, id, { nameAr: 'صنف معدل' });
    expect(getItem(db, id)!.internationalCode).toBe('6221234567890');
  });

  it('is stored as ASCII digits without spaces', () => {
    const id = createItem(db, { nameAr: 'صنف', internationalCode: ' ٦٢٢ ١٢٣٤ ' });
    expect(getItem(db, id)!.internationalCode).toBe('6221234');
  });

  it('finds the item when scanned or searched, like a barcode', () => {
    const id = createItem(db, { nameAr: 'صنف بكود دولي', internationalCode: '6221234567890' });
    expect(findByBarcode(db, '6221234567890')?.id).toBe(id);
    expect(findByBarcode(db, '٦٢٢١٢٣٤٥٦٧٨٩٠')?.id).toBe(id);
    expect(searchItems(db, '6221234567890')[0]?.id).toBe(id);
  });

  it('cannot be the same as another item\'s code', () => {
    createItem(db, { nameAr: 'أ', internationalCode: '111' });
    createItem(db, { nameAr: 'ب', barcodes: ['222'] });
    expect(() => createItem(db, { nameAr: 'ج', internationalCode: '111' })).toThrow(/already belongs/);
    expect(() => createItem(db, { nameAr: 'د', internationalCode: '222' })).toThrow(/already belongs/);
    expect(() => createItem(db, { nameAr: 'هـ', barcodes: ['111'] })).toThrow(/already belongs/);
  });

  it('a code shared before the rule existed does not block editing either item', () => {
    const a = createItem(db, { nameAr: 'أ', internationalCode: '123456789' });
    const b = createItem(db, { nameAr: 'ب' });
    db.prepare('UPDATE items SET international_code = ? WHERE id = ?').run('123456789', b);
    expect(() => updateItem(db, a, { nameAr: 'أ', internationalCode: '123456789', minStock: 5 })).not.toThrow();
    expect(() => updateItem(db, b, { nameAr: 'ب', internationalCode: '123456789', minStock: 5 })).not.toThrow();
    // ...but moving a third item onto it is still refused, with its own message.
    const c = createItem(db, { nameAr: 'ج' });
    expect(() => updateItem(db, c, { nameAr: 'ج', internationalCode: '123456789' })).toThrow(
      expect.objectContaining({ code: 'item.internationalCodeTaken' })
    );
  });
});
