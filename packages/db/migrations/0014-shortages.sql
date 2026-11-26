-- ============================================================
-- Migration 0014 — النواقص (shortages / want list)
--
-- A shortage is a note that an existing item must be ordered: it points at
-- the item by id (never a copy of it), with an optional quantity in one of
-- the item's units and a free note.
--
-- Lifecycle: open → ordered → resolved (it arrived) — or cancelled (taken
-- off the list). Rows are never deleted (rule 9): the closed ones are the
-- history of what was missing and when. At most one OPEN or ORDERED row per
-- item, so the same item cannot be listed twice.
-- ============================================================

CREATE TABLE shortages (
  id            INTEGER PRIMARY KEY,
  item_id       INTEGER NOT NULL REFERENCES items(id),
  unit_id       INTEGER REFERENCES item_units(id),
  required_qty  INTEGER CHECK (required_qty IS NULL OR required_qty > 0),
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'ordered', 'resolved', 'cancelled')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  closed_at     TEXT
);

CREATE UNIQUE INDEX ux_shortages_active_item ON shortages(item_id) WHERE status IN ('open', 'ordered');
CREATE INDEX ix_shortages_status ON shortages(status, created_at);

CREATE TRIGGER trg_shortages_no_delete BEFORE DELETE ON shortages
BEGIN SELECT RAISE(ABORT, 'immutable: shortages are closed, not deleted'); END;
