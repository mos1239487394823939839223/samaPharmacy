/**
 * Medical insurance (spec M6): companies and their contracts, the split of an
 * insured sale, claims and settlement.
 *
 * The split: the company pays `coverage_pct` of every line it covers (lines
 * of excluded items are the patient's), after line discounts, capped by
 * `max_per_invoice` when set and never more than the invoice total. The
 * patient pays the rest at the counter.
 */

import { DomainError, normalizeName } from '@pharmacy/core';
import type { Db } from '../connection';
import { NOW } from '../time';
import { nextSequence } from './items';

export interface InsuranceCompanyInput {
  nameAr: string;
  phone?: string | null;
  contactName?: string | null;
  coveragePct: number;
  maxPerInvoice?: number | null;
  requiresApprovalNo?: boolean;
  notes?: string | null;
}

export interface InsuranceCompanyRow {
  id: number;
  nameAr: string;
  phone: string | null;
  contactName: string | null;
  coveragePct: number;
  maxPerInvoice: number | null;
  requiresApprovalNo: number;
  notes: string | null;
  isActive: number;
  excludedCount: number;
}

export interface InsuranceSaleInput {
  companyId: number;
  memberNo?: string | null;
  approvalNo?: string | null;
}

const SELECT = `
  SELECT c.id, c.name_ar AS nameAr, c.phone, c.contact_name AS contactName, c.coverage_pct AS coveragePct,
         c.max_per_invoice AS maxPerInvoice, c.requires_approval_no AS requiresApprovalNo, c.notes,
         c.is_active AS isActive,
         (SELECT COUNT(*) FROM insurance_exclusions e WHERE e.company_id = c.id) AS excludedCount
  FROM insurance_companies c
`;

function validate(input: InsuranceCompanyInput): void {
  if (!input.nameAr.trim()) throw new DomainError('insurance.nameRequired', 'Company name is required');
  if (!(input.coveragePct >= 0 && input.coveragePct <= 100)) {
    throw new DomainError('insurance.coverageInvalid', 'Coverage must be between 0 and 100');
  }
  if (input.maxPerInvoice != null && (!Number.isInteger(input.maxPerInvoice) || input.maxPerInvoice < 0)) {
    throw new DomainError('insurance.capInvalid', 'Per-invoice cap must be a non-negative amount');
  }
}

export function listInsuranceCompanies(db: Db, includeInactive = false): InsuranceCompanyRow[] {
  return db
    .prepare(`${SELECT} ${includeInactive ? '' : 'WHERE c.is_active = 1'} ORDER BY c.name_ar`)
    .all() as InsuranceCompanyRow[];
}

export function getInsuranceCompany(db: Db, id: number): InsuranceCompanyRow | undefined {
  return db.prepare(`${SELECT} WHERE c.id = ?`).get(id) as InsuranceCompanyRow | undefined;
}

export function createInsuranceCompany(db: Db, input: InsuranceCompanyInput): number {
  validate(input);
  return Number(
    db
      .prepare(
        `INSERT INTO insurance_companies (name_ar, name_norm, phone, contact_name, coverage_pct, max_per_invoice,
           requires_approval_no, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ${NOW})`
      )
      .run(
        input.nameAr.trim(),
        normalizeName(input.nameAr),
        input.phone?.trim() || null,
        input.contactName?.trim() || null,
        input.coveragePct,
        input.maxPerInvoice ?? null,
        input.requiresApprovalNo ? 1 : 0,
        input.notes?.trim() || null
      ).lastInsertRowid
  );
}

export function updateInsuranceCompany(db: Db, id: number, input: InsuranceCompanyInput): void {
  validate(input);
  db.prepare(
    `UPDATE insurance_companies SET name_ar = ?, name_norm = ?, phone = ?, contact_name = ?, coverage_pct = ?,
       max_per_invoice = ?, requires_approval_no = ?, notes = ? WHERE id = ?`
  ).run(
    input.nameAr.trim(),
    normalizeName(input.nameAr),
    input.phone?.trim() || null,
    input.contactName?.trim() || null,
    input.coveragePct,
    input.maxPerInvoice ?? null,
    input.requiresApprovalNo ? 1 : 0,
    input.notes?.trim() || null,
    id
  );
}

export function setInsuranceCompanyActive(db: Db, id: number, active: boolean): void {
  db.prepare('UPDATE insurance_companies SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id);
}

export function listExclusions(db: Db, companyId: number): Array<{ itemId: number; nameAr: string }> {
  return db
    .prepare(
      `SELECT e.item_id AS itemId, i.name_ar AS nameAr FROM insurance_exclusions e JOIN items i ON i.id = e.item_id
       WHERE e.company_id = ? ORDER BY i.name_ar`
    )
    .all(companyId) as Array<{ itemId: number; nameAr: string }>;
}

export function setExclusion(db: Db, companyId: number, itemId: number, excluded: boolean): void {
  if (excluded) {
    db.prepare('INSERT OR IGNORE INTO insurance_exclusions (company_id, item_id) VALUES (?, ?)').run(companyId, itemId);
  } else {
    db.prepare('DELETE FROM insurance_exclusions WHERE company_id = ? AND item_id = ?').run(companyId, itemId);
  }
}

/**
 * The company's share of an insured sale. `lines` carry each line's value
 * after its own discount; `total` is the invoice total (the share never
 * exceeds it).
 */
export function computeInsuranceShare(
  db: Db,
  insurance: InsuranceSaleInput,
  lines: Array<{ itemId: number; value: number }>,
  total: number
): number {
  const company = getInsuranceCompany(db, insurance.companyId);
  if (!company || !company.isActive) throw new DomainError('insurance.companyInvalid', 'Insurance company not found or inactive');
  if (company.requiresApprovalNo && !insurance.approvalNo?.trim()) {
    throw new DomainError('insurance.approvalRequired', `${company.nameAr} requires an approval number`, { company: company.nameAr });
  }
  const excluded = new Set(listExclusions(db, company.id).map((e) => e.itemId));
  const covered = lines.filter((l) => !excluded.has(l.itemId)).reduce((s, l) => s + l.value, 0);
  let share = Math.round((covered * company.coveragePct) / 100);
  if (company.maxPerInvoice != null) share = Math.min(share, company.maxPerInvoice);
  return Math.max(0, Math.min(share, total));
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export interface ClaimableInvoice {
  invoiceId: number;
  serial: number;
  confirmedAt: string;
  memberNo: string | null;
  approvalNo: string | null;
  total: number;
  insuranceShare: number;
  /** Company share net of returns — what is claimed. */
  claimable: number;
}

/** Insured invoices of a company in a period not yet on any claim. */
export function unclaimedInvoices(db: Db, companyId: number, from: string, to: string): ClaimableInvoice[] {
  return (
    db
      .prepare(
        `SELECT s.id AS invoiceId, s.serial, s.confirmed_at AS confirmedAt, s.insurance_member_no AS memberNo,
                s.insurance_approval_no AS approvalNo, s.total, s.insurance_share AS insuranceShare,
                s.insurance_share - COALESCE((SELECT SUM(r.insurance_portion) FROM sales_returns r
                                              WHERE r.source_invoice_id = s.id AND r.status = 'confirmed'), 0) AS claimable
         FROM sales_invoices s
         WHERE s.insurance_company_id = ? AND s.status = 'confirmed' AND s.insurance_share > 0
           AND s.confirmed_at >= ? AND s.confirmed_at < datetime(?, '+1 day')
           AND NOT EXISTS (SELECT 1 FROM insurance_claim_lines l WHERE l.invoice_id = s.id)
         ORDER BY s.confirmed_at`
      )
      .all(companyId, from, to) as ClaimableInvoice[]
  ).filter((i) => i.claimable > 0);
}

export function createClaim(db: Db, companyId: number, from: string, to: string, userId: number): number {
  return db.transaction(() => {
    if (from > to) throw new DomainError('insurance.periodInvalid', 'Period start is after its end');
    const invoices = unclaimedInvoices(db, companyId, from, to);
    if (invoices.length === 0) throw new DomainError('insurance.nothingToClaim', 'No unclaimed insured invoices in this period');
    const total = invoices.reduce((s, i) => s + i.claimable, 0);
    const claimId = Number(
      db
        .prepare(
          `INSERT INTO insurance_claims (serial, company_id, period_from, period_to, status, total_claimed, created_at, user_id)
           VALUES (?, ?, ?, ?, 'draft', ?, ${NOW}, ?)`
        )
        .run(nextSequence(db, 'insurance_claim'), companyId, from, to, total, userId).lastInsertRowid
    );
    const insert = db.prepare('INSERT INTO insurance_claim_lines (claim_id, invoice_id, amount) VALUES (?, ?, ?)');
    for (const i of invoices) insert.run(claimId, i.invoiceId, i.claimable);
    return claimId;
  })();
}

export interface ClaimRow {
  id: number;
  serial: number;
  companyId: number;
  companyName: string;
  periodFrom: string;
  periodTo: string;
  status: 'draft' | 'submitted' | 'settled';
  totalClaimed: number;
  totalPaid: number | null;
  totalRejected: number | null;
  notes: string | null;
  createdAt: string;
  submittedAt: string | null;
  settledAt: string | null;
  invoiceCount: number;
}

const CLAIM_SELECT = `
  SELECT c.id, c.serial, c.company_id AS companyId, co.name_ar AS companyName, c.period_from AS periodFrom,
         c.period_to AS periodTo, c.status, c.total_claimed AS totalClaimed, c.total_paid AS totalPaid,
         c.total_rejected AS totalRejected, c.notes, c.created_at AS createdAt, c.submitted_at AS submittedAt,
         c.settled_at AS settledAt,
         (SELECT COUNT(*) FROM insurance_claim_lines l WHERE l.claim_id = c.id) AS invoiceCount
  FROM insurance_claims c JOIN insurance_companies co ON co.id = c.company_id
`;

export function listClaims(db: Db, companyId?: number): ClaimRow[] {
  return db
    .prepare(`${CLAIM_SELECT} ${companyId ? 'WHERE c.company_id = ?' : ''} ORDER BY c.id DESC LIMIT 200`)
    .all(...(companyId ? [companyId] : [])) as ClaimRow[];
}

export function getClaimLines(db: Db, claimId: number) {
  return db
    .prepare(
      `SELECT l.id, l.invoice_id AS invoiceId, s.serial, s.confirmed_at AS confirmedAt,
              s.insurance_member_no AS memberNo, s.insurance_approval_no AS approvalNo,
              l.amount, l.rejected, l.rejected_reason AS rejectedReason
       FROM insurance_claim_lines l JOIN sales_invoices s ON s.id = l.invoice_id
       WHERE l.claim_id = ? ORDER BY s.confirmed_at`
    )
    .all(claimId) as Array<{
    id: number;
    invoiceId: number;
    serial: number;
    confirmedAt: string;
    memberNo: string | null;
    approvalNo: string | null;
    amount: number;
    rejected: number;
    rejectedReason: string | null;
  }>;
}

export function submitClaim(db: Db, claimId: number): void {
  const claim = db.prepare('SELECT status FROM insurance_claims WHERE id = ?').get(claimId) as { status: string } | undefined;
  if (!claim) throw new DomainError('insurance.claimNotFound', `Claim ${claimId} not found`);
  if (claim.status !== 'draft') throw new DomainError('insurance.claimBadStatus', 'Only a draft claim can be submitted');
  db.prepare(`UPDATE insurance_claims SET status = 'submitted', submitted_at = ${NOW} WHERE id = ?`).run(claimId);
}

/**
 * Record what the company paid and which invoices it rejected. The rejected
 * amount is the sum of the rejected lines; paid + rejected may be less than
 * claimed (a short payment) but never more.
 */
export function settleClaim(
  db: Db,
  claimId: number,
  input: { paid: number; rejections: Array<{ invoiceId: number; reason: string }>; notes?: string | null }
): void {
  db.transaction(() => {
    const claim = db.prepare('SELECT status, total_claimed AS claimed FROM insurance_claims WHERE id = ?').get(claimId) as
      | { status: string; claimed: number }
      | undefined;
    if (!claim) throw new DomainError('insurance.claimNotFound', `Claim ${claimId} not found`);
    if (claim.status !== 'submitted') throw new DomainError('insurance.claimBadStatus', 'Only a submitted claim can be settled');
    if (!Number.isInteger(input.paid) || input.paid < 0) throw new DomainError('payment.amountInvalid', 'Paid amount is invalid');

    const reject = db.prepare(
      'UPDATE insurance_claim_lines SET rejected = 1, rejected_reason = ? WHERE claim_id = ? AND invoice_id = ?'
    );
    for (const r of input.rejections) {
      if (!r.reason.trim()) throw new DomainError('insurance.rejectReasonRequired', 'A rejected invoice needs a reason');
      const res = reject.run(r.reason.trim(), claimId, r.invoiceId);
      if (res.changes === 0) throw new DomainError('insurance.lineNotOnClaim', `Invoice ${r.invoiceId} is not on this claim`);
    }
    const rejected = (
      db.prepare('SELECT COALESCE(SUM(amount), 0) AS s FROM insurance_claim_lines WHERE claim_id = ? AND rejected = 1').get(claimId) as {
        s: number;
      }
    ).s;
    if (input.paid + rejected > claim.claimed) {
      throw new DomainError('insurance.overpaid', 'Paid plus rejected exceeds the claimed amount', { claimed: claim.claimed });
    }
    db.prepare(
      `UPDATE insurance_claims SET status = 'settled', settled_at = ${NOW}, total_paid = ?, total_rejected = ?, notes = ?
       WHERE id = ?`
    ).run(input.paid, rejected, input.notes?.trim() || null, claimId);
  })();
}

export interface InsuranceReceivableRow {
  companyId: number;
  companyName: string;
  /** Insured sales not yet on a claim (net of returns). */
  unclaimed: number;
  /** Draft + submitted claims awaiting payment. */
  pending: number;
  /** Settled claims: claimed − paid − rejected (short payments still owed or written off). */
  shortPaid: number;
  /** Rejected by the company — a loss unless recovered from patients. */
  rejected: number;
}

export function insuranceReceivables(db: Db): InsuranceReceivableRow[] {
  return db
    .prepare(
      `SELECT co.id AS companyId, co.name_ar AS companyName,
              COALESCE((SELECT SUM(s.insurance_share - COALESCE((SELECT SUM(r.insurance_portion) FROM sales_returns r
                                                    WHERE r.source_invoice_id = s.id AND r.status = 'confirmed'), 0))
                        FROM sales_invoices s
                        WHERE s.insurance_company_id = co.id AND s.status = 'confirmed' AND s.insurance_share > 0
                          AND NOT EXISTS (SELECT 1 FROM insurance_claim_lines l WHERE l.invoice_id = s.id)), 0) AS unclaimed,
              COALESCE((SELECT SUM(total_claimed) FROM insurance_claims c WHERE c.company_id = co.id AND c.status != 'settled'), 0) AS pending,
              COALESCE((SELECT SUM(total_claimed - total_paid - total_rejected) FROM insurance_claims c
                        WHERE c.company_id = co.id AND c.status = 'settled'), 0) AS shortPaid,
              COALESCE((SELECT SUM(total_rejected) FROM insurance_claims c WHERE c.company_id = co.id AND c.status = 'settled'), 0) AS rejected
       FROM insurance_companies co
       ORDER BY co.name_ar`
    )
    .all() as InsuranceReceivableRow[];
}
