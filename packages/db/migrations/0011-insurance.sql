-- ============================================================
-- Migration 0011 — medical insurance (spec M6)
--
-- An insured sale is a cash invoice whose total is split: the company's
-- share (coverage % of covered lines, optionally capped per invoice) is a
-- receivable from the company, and the patient pays the rest at the counter
-- (paid_cash = patient share, so the drawer expects exactly that).
--
-- Claims batch a company's unclaimed insured invoices for a period. A claim
-- is drafted, submitted, then settled with what the company paid and which
-- invoices it rejected (and why). Claim lines reference invoices rather than
-- marking them — posted invoices are immutable (migration 0008).
-- ============================================================

CREATE TABLE insurance_companies (
  id                     INTEGER PRIMARY KEY,
  name_ar                TEXT NOT NULL,
  name_norm              TEXT NOT NULL,
  phone                  TEXT,
  contact_name           TEXT,
  coverage_pct           REAL NOT NULL CHECK (coverage_pct >= 0 AND coverage_pct <= 100),
  max_per_invoice        INTEGER CHECK (max_per_invoice IS NULL OR max_per_invoice >= 0),
  requires_approval_no   INTEGER NOT NULL DEFAULT 0,
  notes                  TEXT,
  is_active              INTEGER NOT NULL DEFAULT 1,
  created_at             TEXT NOT NULL
);

-- Items a company does not cover: the patient pays them in full.
CREATE TABLE insurance_exclusions (
  company_id INTEGER NOT NULL REFERENCES insurance_companies(id),
  item_id    INTEGER NOT NULL REFERENCES items(id),
  PRIMARY KEY (company_id, item_id)
);

ALTER TABLE sales_invoices ADD COLUMN insurance_company_id INTEGER REFERENCES insurance_companies(id);
ALTER TABLE sales_invoices ADD COLUMN insurance_member_no  TEXT;
ALTER TABLE sales_invoices ADD COLUMN insurance_approval_no TEXT;
ALTER TABLE sales_invoices ADD COLUMN insurance_share      INTEGER NOT NULL DEFAULT 0;
CREATE INDEX ix_sales_insurance ON sales_invoices(insurance_company_id, confirmed_at);

-- The company's portion of a returned insured line: it comes off the claim.
ALTER TABLE sales_returns ADD COLUMN insurance_portion INTEGER NOT NULL DEFAULT 0;

CREATE TABLE insurance_claims (
  id              INTEGER PRIMARY KEY,
  serial          INTEGER NOT NULL UNIQUE,
  company_id      INTEGER NOT NULL REFERENCES insurance_companies(id),
  period_from     TEXT NOT NULL,
  period_to       TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'settled')),
  total_claimed   INTEGER NOT NULL DEFAULT 0,
  total_paid      INTEGER,
  total_rejected  INTEGER,
  notes           TEXT,
  created_at      TEXT NOT NULL,
  submitted_at    TEXT,
  settled_at      TEXT,
  user_id         INTEGER NOT NULL REFERENCES users(id)
);

CREATE TABLE insurance_claim_lines (
  id               INTEGER PRIMARY KEY,
  claim_id         INTEGER NOT NULL REFERENCES insurance_claims(id),
  invoice_id       INTEGER NOT NULL UNIQUE REFERENCES sales_invoices(id),
  amount           INTEGER NOT NULL,
  rejected         INTEGER NOT NULL DEFAULT 0,
  rejected_reason  TEXT
);
CREATE INDEX ix_claim_lines_claim ON insurance_claim_lines(claim_id);

-- A settled claim is history.
CREATE TRIGGER trg_claims_no_edit_settled BEFORE UPDATE ON insurance_claims
WHEN OLD.status = 'settled'
BEGIN SELECT RAISE(ABORT, 'immutable: a settled insurance claim cannot be edited'); END;
CREATE TRIGGER trg_claims_no_delete BEFORE DELETE ON insurance_claims
BEGIN SELECT RAISE(ABORT, 'immutable: insurance claims are never deleted'); END;
CREATE TRIGGER trg_claim_lines_no_delete BEFORE DELETE ON insurance_claim_lines
BEGIN SELECT RAISE(ABORT, 'immutable: claim lines are never deleted'); END;
CREATE TRIGGER trg_claim_lines_no_edit_settled BEFORE UPDATE ON insurance_claim_lines
WHEN (SELECT status FROM insurance_claims WHERE id = OLD.claim_id) = 'settled'
BEGIN SELECT RAISE(ABORT, 'immutable: lines of a settled claim cannot be edited'); END;

INSERT INTO sequences (name, next_value) VALUES ('insurance_claim', 1);
