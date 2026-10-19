/** Documents that can be printed as a full page (A4) through the system print dialog. */
export type PrintableKind = 'sale' | 'purchase' | 'salesReturn' | 'purchaseReturn';

export interface PrintableLine {
  name: string;
  unitName: string;
  qty: number;
  /** Piastres per unit. */
  unitPrice: number;
  /** Piastres, after any line discount. */
  total: number;
  /** Optional extra column (batch / expiry on a purchase). */
  note?: string | null;
}

export interface PrintableDocument {
  kind: PrintableKind;
  serial: number;
  /** Local ISO date-time. */
  date: string;
  status: string;
  /** cash / credit for invoices, refund method for a sales return. */
  paymentType: string | null;
  /** Customer or supplier — null for a walk-in sale. */
  partyName: string | null;
  partyPhone: string | null;
  /** The supplier's own invoice number, or the source invoice of a return. */
  reference: string | null;
  lines: PrintableLine[];
  /** Piastres. */
  subtotal: number;
  discount: number;
  extra: number;
  tax: number;
  total: number;
  insuranceCompany: string | null;
  insuranceShare: number;
  notes: string | null;
}
