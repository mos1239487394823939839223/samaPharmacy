/**
 * النواقص — items that must be ordered. A shortage references the item by
 * id; the item itself is never copied. Closed rows stay as history.
 */

import { DomainError } from '@pharmacy/core';
import type { ShortageInput, ShortageRow, ShortageStatus, ShortageUpdate } from '@pharmacy/shared';
import type { Db } from '../connection';
import { NOW } from '../time';

const SELECT = `
  SELECT s.id, s.item_id AS itemId, i.code AS itemCode, i.name_ar AS itemNameAr, i.name_en AS itemNameEn,
         (SELECT barcode FROM item_barcodes b WHERE b.item_id = i.id ORDER BY b.is_primary DESC, b.id LIMIT 1) AS barcode,
         COALESCE((SELECT SUM(qty_on_hand) FROM batches bt WHERE bt.item_id = i.id AND bt.is_quarantined = 0), 0) AS stockBase,
         s.unit_id AS unitId, u.name_ar AS unitNameAr, s.required_qty AS requiredQty, s.note, s.status,
         s.created_at AS createdAt, s.updated_at AS updatedAt, s.closed_at AS closedAt
  FROM shortages s
  JOIN items i ON i.id = s.item_id
  LEFT JOIN item_units u ON u.id = s.unit_id
`;

/** Describe a base-unit quantity in the item's units, largest first. */
function describe(db: Db, itemId: number, base: number): string {
  const units = db
    .prepare('SELECT name_ar AS n, factor AS f FROM item_units WHERE item_id = ? AND allow_sale = 1 ORDER BY factor DESC')
    .all(itemId) as { n: string; f: number }[];
  if (units.length === 0) return String(base);
  const parts: string[] = [];
  let rest = base;
  for (const u of units) {
    const k = Math.floor(rest / u.f);
    if (k) parts.push(`${k} ${u.n}`);
    rest -= k * u.f;
  }
  return parts.length ? parts.join(' + ') : `0 ${units[units.length - 1]!.n}`;
}

export function listShortages(db: Db, scope: 'active' | 'closed' | 'all' = 'active'): ShortageRow[] {
  const where =
    scope === 'active' ? "WHERE s.status IN ('open','ordered')" : scope === 'closed' ? "WHERE s.status IN ('resolved','cancelled')" : '';
  const rows = db.prepare(`${SELECT} ${where} ORDER BY s.created_at DESC, s.id DESC`).all() as Omit<ShortageRow, 'stockText'>[];
  return rows.map((r) => ({ ...r, stockText: describe(db, r.itemId, r.stockBase) }));
}

/** Item ids that are on the list right now — for "already in النواقص" badges. */
export function activeShortageItemIds(db: Db): number[] {
  return (db.prepare("SELECT item_id AS id FROM shortages WHERE status IN ('open','ordered')").all() as { id: number }[]).map((r) => r.id);
}

function assertUnit(db: Db, itemId: number, unitId: number | null | undefined): void {
  if (unitId == null) return;
  const ok = db.prepare('SELECT 1 FROM item_units WHERE id = ? AND item_id = ?').get(unitId, itemId);
  if (!ok) throw new DomainError('shortage.unitInvalid', `Unit ${unitId} is not a unit of item ${itemId}`);
}

export function addShortage(db: Db, input: ShortageInput): number {
  return db.transaction(() => {
    const item = db.prepare('SELECT name_ar AS name, is_active AS active FROM items WHERE id = ?').get(input.itemId) as
      | { name: string; active: number }
      | undefined;
    if (!item || !item.active) throw new DomainError('item.notFound', `Item ${input.itemId} not found`, { id: input.itemId });
    const existing = db
      .prepare("SELECT id FROM shortages WHERE item_id = ? AND status IN ('open','ordered')")
      .get(input.itemId) as { id: number } | undefined;
    if (existing) throw new DomainError('shortage.exists', `Item ${input.itemId} is already on the list`, { item: item.name, id: existing.id });
    assertUnit(db, input.itemId, input.unitId);
    const r = db
      .prepare(`INSERT INTO shortages (item_id, unit_id, required_qty, note, created_at, updated_at) VALUES (?, ?, ?, ?, ${NOW}, ${NOW})`)
      .run(input.itemId, input.unitId ?? null, input.requiredQty ?? null, input.note?.trim() || null);
    return Number(r.lastInsertRowid);
  })();
}

function getStatus(db: Db, id: number): { itemId: number; status: ShortageStatus } {
  const row = db.prepare('SELECT item_id AS itemId, status FROM shortages WHERE id = ?').get(id) as
    | { itemId: number; status: ShortageStatus }
    | undefined;
  if (!row) throw new DomainError('shortage.notFound', `Shortage ${id} not found`, { id });
  return row;
}

export function updateShortage(db: Db, id: number, input: ShortageUpdate): void {
  const { itemId, status } = getStatus(db, id);
  if (status === 'resolved' || status === 'cancelled') throw new DomainError('shortage.closed', `Shortage ${id} is closed`);
  assertUnit(db, itemId, input.unitId);
  db.prepare(`UPDATE shortages SET unit_id = ?, required_qty = ?, note = ?, updated_at = ${NOW} WHERE id = ?`).run(
    input.unitId ?? null,
    input.requiredQty ?? null,
    input.note?.trim() || null,
    id
  );
}

/**
 * Move along the lifecycle. A closed row (resolved / cancelled) is final —
 * listing the item again opens a new row, keeping the old one as history.
 */
export function setShortageStatus(db: Db, id: number, next: ShortageStatus): void {
  const { status } = getStatus(db, id);
  if (status === next) return;
  if (status === 'resolved' || status === 'cancelled') throw new DomainError('shortage.closed', `Shortage ${id} is closed`);
  const closing = next === 'resolved' || next === 'cancelled';
  db.prepare(`UPDATE shortages SET status = ?, updated_at = ${NOW}, closed_at = ${closing ? NOW : 'NULL'} WHERE id = ?`).run(next, id);
}
