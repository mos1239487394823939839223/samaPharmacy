-- ============================================================
-- Migration 0010 — prescriptions (BR-7, spec M7) and held invoices
--
-- A sale containing a scheduled (controlled) item cannot be confirmed
-- without a prescription record: serial, prescriber and syndicate number,
-- patient and national ID. The record is kept per invoice so a held
-- invoice can carry it until it is paid, and the narcotics register rows
-- written at confirm point back to it.
-- ============================================================

CREATE TABLE prescriptions (
  id                  INTEGER PRIMARY KEY,
  invoice_id          INTEGER NOT NULL UNIQUE REFERENCES sales_invoices(id),
  prescription_no     TEXT NOT NULL,
  prescription_date   TEXT,
  doctor_name         TEXT NOT NULL,
  doctor_syndicate_no TEXT NOT NULL,
  patient_name        TEXT NOT NULL,
  patient_id_no       TEXT NOT NULL,
  notes               TEXT,
  created_at          TEXT NOT NULL,
  user_id             INTEGER NOT NULL REFERENCES users(id)
);
CREATE INDEX ix_prescriptions_patient ON prescriptions(patient_id_no);

CREATE TRIGGER trg_prescriptions_no_update BEFORE UPDATE ON prescriptions
BEGIN SELECT RAISE(ABORT, 'immutable: prescriptions are never edited'); END;
CREATE TRIGGER trg_prescriptions_no_delete BEFORE DELETE ON prescriptions
BEGIN SELECT RAISE(ABORT, 'immutable: prescriptions are never deleted'); END;

-- Where a register row came from, and why a reversal was made.
ALTER TABLE narcotics_register ADD COLUMN reason TEXT;
ALTER TABLE narcotics_register ADD COLUMN prescription_id INTEGER REFERENCES prescriptions(id);

-- Held invoices are listed on the till; when they were parked matters.
ALTER TABLE sales_invoices ADD COLUMN held_at TEXT;
