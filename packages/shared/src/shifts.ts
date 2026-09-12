export interface ShiftRow {
  id: number;
  userId: number;
  warehouseId: number;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  expectedCash: number | null;
  countedCash: number | null;
  variance: number | null;
  varianceNote: string | null;
  handedTo: number | null;
  status: 'open' | 'closed';
}

export interface CashTransactionRow {
  id: number;
  shiftId: number | null;
  at: string;
  direction: 'in' | 'out';
  amount: number;
  category: string | null;
  note: string | null;
}

export interface CloseShiftInput {
  countedCash: number;
  varianceNote?: string | null;
  handedTo?: number | null;
}

export interface ShiftSalesSummary {
  count: number;
  cashTotal: number;
  creditTotal: number;
}
