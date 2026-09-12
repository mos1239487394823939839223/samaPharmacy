export interface ItemStockRow {
  itemId: number;
  code: number;
  nameAr: string;
  warehouseId: number | null;
  qtyOnHand: number;
  nearestExpiry: string | null;
  stockValue: number;
}

export interface BatchRow {
  id: number;
  itemId: number;
  warehouseId: number;
  batchNumber: string | null;
  expiryDate: string | null;
  qtyOnHand: number;
  unitCost: number;
  receivedAt: string;
  isQuarantined: number;
}

export interface StockMoveRow {
  id: number;
  batchId: number;
  qtyDelta: number;
  unitCost: number;
  moveType: string;
  refTable: string | null;
  refId: number | null;
  reason: string | null;
  at: string;
}
