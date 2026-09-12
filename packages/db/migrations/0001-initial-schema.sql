-- ============================================================
-- Migration 0001 — initial schema
--
-- Source: docs/schema.sql (the source of truth).
--
-- Two deliberate deviations, both logged in docs/DECISIONS.md:
--
--   1. The PRAGMA statements at the top of schema.sql are omitted here.
--      journal_mode cannot be changed inside a transaction, and the other
--      three are per-connection settings, not schema. They are applied in
--      packages/db/src/connection.ts on every connection instead.
--
--   2. sales_invoices gains nullable eta_uuid and eta_status (decision D4).
--      pharmacy-system-spec.md §7 asks for these so ETA e-invoicing can be
--      added without a migration against a populated invoice table. They are
--      unused until ETA is confirmed mandatory.
-- ============================================================

-- ============================================================
-- Pharmacy Management System — SQLite schema
-- Conventions:
--   money      INTEGER, piastres (100 = 1 EGP). Never REAL.
--   quantity   INTEGER, base units (tablets/ml). Never packs.
--   date       TEXT 'YYYY-MM-DD'
--   timestamp  TEXT 'YYYY-MM-DDTHH:MM:SS'
--   boolean    INTEGER 0/1
-- ============================================================


-- ============================================================
-- SYSTEM
-- ============================================================

CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Human-facing sequential codes (مؤشر الصنف / مؤشر العميل / invoice serials).
-- Always incremented inside the same transaction as the row it numbers.
CREATE TABLE sequences (
  name        TEXT PRIMARY KEY,
  next_value  INTEGER NOT NULL
);

CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  display_name  TEXT NOT NULL,          -- 'ph /samah'
  password_hash TEXT NOT NULL,          -- argon2id
  role          TEXT NOT NULL CHECK (role IN
                  ('owner','manager','pharmacist','cashier','data_entry')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id),
  at          TEXT NOT NULL DEFAULT (datetime('now')),
  machine     TEXT,
  action      TEXT NOT NULL,            -- 'price_change','stock_adjust','void',...
  entity      TEXT NOT NULL,
  entity_id   INTEGER,
  before_json TEXT,
  after_json  TEXT,
  note        TEXT
);
CREATE INDEX ix_audit_at     ON audit_log(at);
CREATE INDEX ix_audit_entity ON audit_log(entity, entity_id);

-- ============================================================
-- REFERENCE DATA
-- ============================================================

CREATE TABLE item_types        (id INTEGER PRIMARY KEY, name_ar TEXT NOT NULL, name_en TEXT);
CREATE TABLE manufacturers     (id INTEGER PRIMARY KEY, name_ar TEXT NOT NULL, name_en TEXT, is_local INTEGER NOT NULL DEFAULT 1);
CREATE TABLE scientific_groups (id INTEGER PRIMARY KEY, name_ar TEXT NOT NULL, name_en TEXT);
CREATE TABLE governorates      (id INTEGER PRIMARY KEY, name_ar TEXT NOT NULL);
CREATE TABLE cities            (id INTEGER PRIMARY KEY, governorate_id INTEGER NOT NULL REFERENCES governorates(id), name_ar TEXT NOT NULL);

CREATE TABLE active_ingredients (
  id              INTEGER PRIMARY KEY,
  name_ar         TEXT NOT NULL,
  name_en         TEXT,
  name_norm       TEXT NOT NULL          -- normalized, drives substitute search
);
CREATE INDEX ix_ingredient_norm ON active_ingredients(name_norm);

CREATE TABLE warehouses (          -- المخازن
  id          INTEGER PRIMARY KEY,
  name_ar     TEXT NOT NULL,             -- 'المخزن الرئيسي'
  is_default  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1
);

-- ============================================================
-- ITEMS  (اضافة صنف)
-- ============================================================

CREATE TABLE items (
  id                    INTEGER PRIMARY KEY,
  code                  INTEGER NOT NULL UNIQUE,   -- مؤشر الصنف, e.g. 256059
  item_type_id          INTEGER REFERENCES item_types(id),

  name_ar               TEXT NOT NULL,             -- اسم الصنف باللغة العربية
  name_en               TEXT,                      -- اسم الصنف باللغة الانجليزية
  name_ar_norm          TEXT NOT NULL,             -- normalized for search
  name_en_norm          TEXT,

  international_code    TEXT,                      -- الكود الدولي (EAN)
  origin                TEXT NOT NULL DEFAULT 'local'
                          CHECK (origin IN ('local','imported')),   -- منشأ الصنف
  manufacturer_id       INTEGER REFERENCES manufacturers(id),
  item_nature           TEXT,                      -- طبيعة الصنف

  -- بيانات علمية
  scientific_name       TEXT,                      -- الاسم العلمي
  main_ingredient_id    INTEGER REFERENCES active_ingredients(id),
  main_ingredient_pct   REAL,                      -- نسبة المادة الفعالة %
  ingredient_norm       TEXT,                      -- denormalized for fast search

  -- classification / handling
  schedule_class        TEXT NOT NULL DEFAULT 'none'  -- صنف جدول
                          CHECK (schedule_class IN ('none','table1','table2','table3')),
  storage_condition     TEXT NOT NULL DEFAULT 'room'  -- صنف تخزين
                          CHECK (storage_condition IN ('room','fridge','freezer')),
  no_expiry             INTEGER NOT NULL DEFAULT 0,   -- ليس له تاريخ صلاحية
  requires_prescription INTEGER NOT NULL DEFAULT 0,

  shelf_location        TEXT,                      -- مكان الصنف
  public_price          INTEGER,                   -- EDA price, piastres, per base unit
  min_stock             INTEGER NOT NULL DEFAULT 0,
  max_stock             INTEGER,

  is_active             INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at            TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ix_items_name_ar_norm  ON items(name_ar_norm);
CREATE INDEX ix_items_name_en_norm  ON items(name_en_norm);
CREATE INDEX ix_items_ingredient    ON items(main_ingredient_id);
CREATE INDEX ix_items_active        ON items(is_active);

-- اضافة باركود اخر للصنف — many barcodes per item
CREATE TABLE item_barcodes (
  id        INTEGER PRIMARY KEY,
  item_id   INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  barcode   TEXT NOT NULL UNIQUE,
  is_primary INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_barcode_item ON item_barcodes(item_id);

-- المجموعات العلمية — many groups per item
CREATE TABLE item_scientific_groups (
  item_id   INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  group_id  INTEGER NOT NULL REFERENCES scientific_groups(id),
  PRIMARY KEY (item_id, group_id)
);

-- Secondary ingredients beyond the main one (combination drugs)
CREATE TABLE item_ingredients (
  item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES active_ingredients(id),
  strength      TEXT,
  PRIMARY KEY (item_id, ingredient_id)
);

-- الأسعار و الوحدات — علبة / شريط / قرص, each with a factor and price
CREATE TABLE item_units (
  id            INTEGER PRIMARY KEY,
  item_id       INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name_ar       TEXT NOT NULL,            -- 'علبة'
  factor        INTEGER NOT NULL,         -- base units contained; base unit factor = 1
  sale_price    INTEGER NOT NULL,         -- piastres
  is_base       INTEGER NOT NULL DEFAULT 0,
  is_default_sale INTEGER NOT NULL DEFAULT 0,
  allow_sale    INTEGER NOT NULL DEFAULT 1,
  UNIQUE (item_id, name_ar)
);
CREATE INDEX ix_item_units_item ON item_units(item_id);

-- بيانات مورد الصنف
CREATE TABLE item_suppliers (
  item_id        INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  supplier_id    INTEGER NOT NULL REFERENCES suppliers(id),
  supplier_code  TEXT,
  is_preferred   INTEGER NOT NULL DEFAULT 0,
  last_cost      INTEGER,
  PRIMARY KEY (item_id, supplier_id)
);

CREATE TABLE price_history (
  id           INTEGER PRIMARY KEY,
  item_id      INTEGER NOT NULL REFERENCES items(id),
  old_price    INTEGER,
  new_price    INTEGER NOT NULL,
  changed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by   INTEGER REFERENCES users(id),
  source       TEXT                        -- 'manual' | 'eda_circular' | 'import'
);

-- ============================================================
-- PARTIES
-- ============================================================

CREATE TABLE suppliers (
  id             INTEGER PRIMARY KEY,
  code           INTEGER NOT NULL UNIQUE,
  name_ar        TEXT NOT NULL,
  name_norm      TEXT NOT NULL,
  phone1         TEXT,
  phone2         TEXT,
  address        TEXT,
  tax_number     TEXT,
  opening_balance INTEGER NOT NULL DEFAULT 0,
  payment_terms_days INTEGER,
  is_active      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_suppliers_norm ON suppliers(name_norm);

CREATE TABLE customers (           -- اضافة عميل
  id                   INTEGER PRIMARY KEY,
  code                 INTEGER NOT NULL UNIQUE,   -- مؤشر العميل, e.g. 60462
  name                 TEXT NOT NULL,
  name_norm            TEXT NOT NULL,
  mobile1              TEXT NOT NULL,
  mobile2              TEXT,
  email                TEXT,

  -- B2B: customer may itself be a pharmacy or clinic
  pharmacy_owner_name  TEXT,                      -- اسم صاحب الصيدلية
  pharmacy_phone       TEXT,                      -- رقم هاتف الصيدلية

  account_type         TEXT NOT NULL DEFAULT 'individual'   -- نوع حساب العميل
                         CHECK (account_type IN ('individual','pharmacy','clinic','company')),
  parent_customer_id   INTEGER REFERENCES customers(id),    -- تابع لـ
  installment_company  TEXT,                      -- شركة التقسيط
  installment_tier     TEXT,                      -- فئة التقسيط

  payment_method       TEXT NOT NULL DEFAULT 'cash'
                         CHECK (payment_method IN ('cash','credit')),
  opening_balance      INTEGER NOT NULL DEFAULT 0,
  credit_limit         INTEGER,
  insurance_number     TEXT,                      -- الرقم التأميني

  is_vip               INTEGER NOT NULL DEFAULT 0,
  print_name_on_invoice INTEGER NOT NULL DEFAULT 1,
  is_suspended         INTEGER NOT NULL DEFAULT 0,  -- إيقاف حساب العميل
  sell_at_cost         INTEGER NOT NULL DEFAULT 0,  -- البيع بسعر التكلفة

  -- three discount rates observed on the form; confirm semantics before use
  discount_cash_pct    REAL NOT NULL DEFAULT 0,
  discount_credit_pct  REAL NOT NULL DEFAULT 0,
  discount_invoice_pct REAL NOT NULL DEFAULT 0,

  -- بيانات إضافية
  gender               TEXT CHECK (gender IN ('male','female') OR gender IS NULL),
  marital_status       TEXT,
  birth_date           TEXT,
  has_children         INTEGER NOT NULL DEFAULT 0,
  children_count       INTEGER,

  notes                TEXT,
  is_active            INTEGER NOT NULL DEFAULT 1,
  created_at           TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX ix_customers_norm   ON customers(name_norm);
CREATE INDEX ix_customers_mobile ON customers(mobile1);

CREATE TABLE customer_addresses (
  id              INTEGER PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  delivery_address TEXT,                   -- عنوان التوصيل
  governorate_id  INTEGER REFERENCES governorates(id),
  city_id         INTEGER REFERENCES cities(id),
  area            TEXT,                    -- المنطقة
  is_default      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE customer_tags (
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tag         TEXT NOT NULL,
  PRIMARY KEY (customer_id, tag)
);

-- ============================================================
-- STOCK
-- ============================================================

CREATE TABLE batches (
  id             INTEGER PRIMARY KEY,
  item_id        INTEGER NOT NULL REFERENCES items(id),
  warehouse_id   INTEGER NOT NULL REFERENCES warehouses(id),
  batch_number   TEXT,
  expiry_date    TEXT,                     -- NULL when item.no_expiry = 1
  qty_on_hand    INTEGER NOT NULL DEFAULT 0,   -- base units
  unit_cost      INTEGER NOT NULL,             -- landed cost, piastres per base unit
  received_at    TEXT NOT NULL DEFAULT (datetime('now')),
  source_line_id INTEGER,                  -- purchase_invoice_lines.id
  is_quarantined INTEGER NOT NULL DEFAULT 0,
  UNIQUE (item_id, warehouse_id, batch_number, expiry_date, unit_cost)
);
CREATE INDEX ix_batches_item_expiry ON batches(item_id, expiry_date);
CREATE INDEX ix_batches_expiry      ON batches(expiry_date) WHERE qty_on_hand > 0;

-- Append-only movement ledger. Every change to qty_on_hand writes a row here.
-- Stock can always be rebuilt from this table; that is the point of it.
CREATE TABLE stock_moves (
  id            INTEGER PRIMARY KEY,
  batch_id      INTEGER NOT NULL REFERENCES batches(id),
  item_id       INTEGER NOT NULL REFERENCES items(id),
  warehouse_id  INTEGER NOT NULL REFERENCES warehouses(id),
  qty_delta     INTEGER NOT NULL,         -- negative for issues
  unit_cost     INTEGER NOT NULL,
  move_type     TEXT NOT NULL CHECK (move_type IN
                  ('purchase','sale','sale_return','purchase_return',
                   'adjustment','transfer_in','transfer_out','count')),
  ref_table     TEXT,
  ref_id        INTEGER,
  reason        TEXT,
  at            TEXT NOT NULL DEFAULT (datetime('now')),
  user_id       INTEGER REFERENCES users(id)
);
CREATE INDEX ix_moves_item ON stock_moves(item_id, at);
CREATE INDEX ix_moves_ref  ON stock_moves(ref_table, ref_id);

CREATE TABLE stock_adjustments (
  id          INTEGER PRIMARY KEY,
  at          TEXT NOT NULL DEFAULT (datetime('now')),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  reason_code TEXT NOT NULL CHECK (reason_code IN
                ('damage','expiry','theft','correction','count')),
  note        TEXT,
  approved_by INTEGER REFERENCES users(id)
);

-- ============================================================
-- SALES  (فواتير المبيعات)
-- ============================================================

CREATE TABLE sales_invoices (
  id                 INTEGER PRIMARY KEY,
  serial             INTEGER NOT NULL UNIQUE,   -- مسلسل الفاتورة, e.g. 62341
  warehouse_id       INTEGER NOT NULL REFERENCES warehouses(id),
  customer_id        INTEGER REFERENCES customers(id),   -- NULL = walk-in
  shift_id           INTEGER REFERENCES shifts(id),
  user_id            INTEGER NOT NULL REFERENCES users(id),

  invoice_type       TEXT NOT NULL CHECK (invoice_type IN ('cash','credit')),  -- كاش / آجل
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','held','confirmed','voided')), -- مؤكدة
  is_home_delivery   INTEGER NOT NULL DEFAULT 0,   -- توصيل منزلي
  delivery_address   TEXT,

  subtotal           INTEGER NOT NULL DEFAULT 0,
  line_discount_total INTEGER NOT NULL DEFAULT 0,
  extra_discount_pct REAL NOT NULL DEFAULT 0,      -- نسبة الخصم الإضافي
  extra_discount_amt INTEGER NOT NULL DEFAULT 0,   -- قيمة الخصم الإضافي
  extra_charge       INTEGER NOT NULL DEFAULT 0,   -- مبلغ إضافي
  total              INTEGER NOT NULL DEFAULT 0,   -- الاجمالي
  paid_cash          INTEGER NOT NULL DEFAULT 0,   -- المدفوع كاش
  cost_total         INTEGER NOT NULL DEFAULT 0,   -- snapshot for margin reporting

  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at       TEXT
);
CREATE INDEX ix_sales_created  ON sales_invoices(created_at);
CREATE INDEX ix_sales_customer ON sales_invoices(customer_id);
CREATE INDEX ix_sales_status   ON sales_invoices(status);
CREATE INDEX ix_sales_shift    ON sales_invoices(shift_id);

-- One row per batch consumed. Selling 3 boxes across 2 batches = 2 rows.
CREATE TABLE sales_invoice_lines (
  id            INTEGER PRIMARY KEY,
  invoice_id    INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  line_no       INTEGER NOT NULL,
  item_id       INTEGER NOT NULL REFERENCES items(id),
  batch_id      INTEGER NOT NULL REFERENCES batches(id),

  unit_id       INTEGER NOT NULL REFERENCES item_units(id),  -- الوحدة ('علبة')
  qty_in_unit   REAL NOT NULL,            -- as entered, e.g. 1.00
  qty_base      INTEGER NOT NULL,         -- qty_in_unit * unit.factor
  unit_price    INTEGER NOT NULL,         -- السعر, per entered unit

  -- Grid convention: ق = قبل (before), ب = بعد (after)
  value_before_discount INTEGER NOT NULL, -- قيمة ق.خ = qty_in_unit * unit_price
  discount_pct          REAL NOT NULL DEFAULT 0,      -- خصم
  discount_amt          INTEGER NOT NULL DEFAULT 0,
  value_after_discount  INTEGER NOT NULL, -- قيمة ب.خ = before - discount (line total)

  unit_cost     INTEGER NOT NULL,         -- snapshot from batch at sale time
  expiry_date   TEXT,                     -- snapshot, shown in grid
  UNIQUE (invoice_id, line_no)
);
CREATE INDEX ix_sale_lines_item ON sales_invoice_lines(item_id);

-- ============================================================
-- SALES RETURNS  (مرتجع فواتير البيع / مرتجع بيع عام)
-- ============================================================

CREATE TABLE sales_returns (
  id                  INTEGER PRIMARY KEY,
  serial              INTEGER NOT NULL UNIQUE,
  source_invoice_id   INTEGER REFERENCES sales_invoices(id),  -- NULL = مرتجع بيع عام
  warehouse_id        INTEGER NOT NULL REFERENCES warehouses(id),
  customer_id         INTEGER REFERENCES customers(id),
  shift_id            INTEGER REFERENCES shifts(id),
  user_id             INTEGER NOT NULL REFERENCES users(id),
  approved_by         INTEGER REFERENCES users(id),           -- required when source is NULL
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','confirmed','voided')),
  total               INTEGER NOT NULL DEFAULT 0,
  refund_method       TEXT CHECK (refund_method IN ('cash','credit_note','account')),
  reason              TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sales_return_lines (
  id             INTEGER PRIMARY KEY,
  return_id      INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
  source_line_id INTEGER REFERENCES sales_invoice_lines(id),
  item_id        INTEGER NOT NULL REFERENCES items(id),
  batch_id       INTEGER NOT NULL REFERENCES batches(id),
  unit_id        INTEGER NOT NULL REFERENCES item_units(id),
  qty_in_unit    REAL NOT NULL,
  qty_base       INTEGER NOT NULL,
  unit_price     INTEGER NOT NULL,
  line_total     INTEGER NOT NULL,
  to_quarantine  INTEGER NOT NULL DEFAULT 0   -- fridge items, damaged goods
);

-- ============================================================
-- PURCHASES  (فواتير الشراء)
-- ============================================================

CREATE TABLE purchase_invoices (
  id                 INTEGER PRIMARY KEY,
  serial             INTEGER NOT NULL UNIQUE,
  supplier_invoice_no TEXT NOT NULL,            -- رقم الفاتورة
  supplier_id        INTEGER NOT NULL REFERENCES suppliers(id),
  warehouse_id       INTEGER NOT NULL REFERENCES warehouses(id),
  user_id            INTEGER NOT NULL REFERENCES users(id),

  purchase_type      TEXT NOT NULL CHECK (purchase_type IN ('cash','credit')),  -- نوع الشراء
  invoice_date       TEXT NOT NULL,             -- تاريخ الفاتورة
  due_date           TEXT,
  status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','held','confirmed','voided')),

  expenses           INTEGER NOT NULL DEFAULT 0,  -- قيمة المصاريف (landed)
  extra_discount_amt INTEGER NOT NULL DEFAULT 0,  -- قيمة الخصم الإضافي
  extra_discount_pct REAL NOT NULL DEFAULT 0,     -- نسبة الخصم الإضافي
  subtotal           INTEGER NOT NULL DEFAULT 0,
  tax_total          INTEGER NOT NULL DEFAULT 0,
  total              INTEGER NOT NULL DEFAULT 0,
  paid               INTEGER NOT NULL DEFAULT 0,

  notes              TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  confirmed_at       TEXT,
  UNIQUE (supplier_id, supplier_invoice_no)
);
CREATE INDEX ix_purch_supplier ON purchase_invoices(supplier_id, invoice_date);

CREATE TABLE purchase_invoice_lines (
  id              INTEGER PRIMARY KEY,
  invoice_id      INTEGER NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  line_no         INTEGER NOT NULL,
  item_id         INTEGER NOT NULL REFERENCES items(id),
  unit_id         INTEGER NOT NULL REFERENCES item_units(id),

  qty_in_unit     REAL NOT NULL,
  qty_base        INTEGER NOT NULL,
  bonus_in_unit   REAL NOT NULL DEFAULT 0,    -- بونص
  bonus_base      INTEGER NOT NULL DEFAULT 0,

  batch_number    TEXT,
  expiry_date     TEXT,                       -- تاريخ الصلاحية

  unit_purchase_price INTEGER NOT NULL,

  -- Same convention as the sales grid: ق = قبل, ب = بعد
  value_before_discount INTEGER NOT NULL,     -- ق.خ
  discount_pct    REAL NOT NULL DEFAULT 0,
  discount_amt    INTEGER NOT NULL DEFAULT 0,
  value_after_discount  INTEGER NOT NULL,     -- ب.خ
  -- Purchase grid also shows ق.ض / ب.ض — same convention applied to tax (قبل/بعد الضريبة).
  -- Confirm against the live screen before relying on it.
  tax_pct         REAL NOT NULL DEFAULT 0,
  tax_amt         INTEGER NOT NULL DEFAULT 0,
  value_after_tax INTEGER NOT NULL,           -- ب.ض (line total)

  -- computed on confirm: (line_total + allocated expenses - allocated header discount)
  --                      / (qty_base + bonus_base)
  landed_unit_cost INTEGER NOT NULL DEFAULT 0,
  batch_id        INTEGER REFERENCES batches(id),
  UNIQUE (invoice_id, line_no)
);

CREATE TABLE purchase_returns (
  id                INTEGER PRIMARY KEY,
  serial            INTEGER NOT NULL UNIQUE,
  source_invoice_id INTEGER REFERENCES purchase_invoices(id),  -- NULL = مرتجعات شراء عام
  supplier_id       INTEGER NOT NULL REFERENCES suppliers(id),
  warehouse_id      INTEGER NOT NULL REFERENCES warehouses(id),
  user_id           INTEGER NOT NULL REFERENCES users(id),
  status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','confirmed','voided')),
  total             INTEGER NOT NULL DEFAULT 0,
  reason            TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE purchase_return_lines (
  id           INTEGER PRIMARY KEY,
  return_id    INTEGER NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
  item_id      INTEGER NOT NULL REFERENCES items(id),
  batch_id     INTEGER NOT NULL REFERENCES batches(id),
  unit_id      INTEGER NOT NULL REFERENCES item_units(id),
  qty_in_unit  REAL NOT NULL,
  qty_base     INTEGER NOT NULL,
  unit_cost    INTEGER NOT NULL,
  line_total   INTEGER NOT NULL
);

-- ============================================================
-- MONEY  (الحسابات / صرف وتوريد نقدية / تسليم الدرج)
-- ============================================================

CREATE TABLE customer_ledger (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  at          TEXT NOT NULL DEFAULT (datetime('now')),
  entry_type  TEXT NOT NULL CHECK (entry_type IN
                ('opening','sale','payment','return','adjustment')),
  debit       INTEGER NOT NULL DEFAULT 0,
  credit      INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL,
  ref_table   TEXT,
  ref_id      INTEGER,
  note        TEXT
);
CREATE INDEX ix_cust_ledger ON customer_ledger(customer_id, at);

CREATE TABLE supplier_ledger (
  id          INTEGER PRIMARY KEY,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  at          TEXT NOT NULL DEFAULT (datetime('now')),
  entry_type  TEXT NOT NULL CHECK (entry_type IN
                ('opening','purchase','payment','return','adjustment')),
  debit       INTEGER NOT NULL DEFAULT 0,
  credit      INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL,
  ref_table   TEXT,
  ref_id      INTEGER,
  note        TEXT
);
CREATE INDEX ix_supp_ledger ON supplier_ledger(supplier_id, at);

CREATE TABLE shifts (              -- درج اليومية / تسليم الدرج
  id             INTEGER PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  warehouse_id   INTEGER NOT NULL REFERENCES warehouses(id),
  opened_at      TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at      TEXT,
  opening_float  INTEGER NOT NULL DEFAULT 0,
  expected_cash  INTEGER,
  counted_cash   INTEGER,
  variance       INTEGER,
  variance_note  TEXT,
  handed_to      INTEGER REFERENCES users(id),
  status         TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed'))
);
CREATE INDEX ix_shifts_user ON shifts(user_id, opened_at);

CREATE TABLE cash_transactions (   -- صرف وتوريد نقدية
  id          INTEGER PRIMARY KEY,
  shift_id    INTEGER REFERENCES shifts(id),
  at          TEXT NOT NULL DEFAULT (datetime('now')),
  direction   TEXT NOT NULL CHECK (direction IN ('in','out')),
  amount      INTEGER NOT NULL,
  category    TEXT,
  note        TEXT,
  user_id     INTEGER NOT NULL REFERENCES users(id)
);

-- ============================================================
-- COMPLIANCE
-- ============================================================

-- Append-only. No UPDATE, no DELETE. Corrections are reversing rows.
CREATE TABLE narcotics_register (
  id                INTEGER PRIMARY KEY,
  serial            INTEGER NOT NULL UNIQUE,    -- gapless
  at                TEXT NOT NULL DEFAULT (datetime('now')),
  item_id           INTEGER NOT NULL REFERENCES items(id),
  batch_id          INTEGER REFERENCES batches(id),
  direction         TEXT NOT NULL CHECK (direction IN ('in','out','reversal')),
  qty_base          INTEGER NOT NULL,
  balance_after     INTEGER NOT NULL,
  prescription_no   TEXT,
  doctor_name       TEXT,
  doctor_syndicate_no TEXT,
  patient_name      TEXT,
  patient_id_no     TEXT,
  ref_table         TEXT,
  ref_id            INTEGER,
  reverses_id       INTEGER REFERENCES narcotics_register(id),
  user_id           INTEGER NOT NULL REFERENCES users(id),
  approved_by       INTEGER REFERENCES users(id)
);
CREATE INDEX ix_narc_item ON narcotics_register(item_id, at);

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW v_item_stock AS
SELECT
  i.id            AS item_id,
  i.code,
  i.name_ar,
  b.warehouse_id,
  SUM(b.qty_on_hand)                                   AS qty_on_hand,
  MIN(CASE WHEN b.qty_on_hand > 0 THEN b.expiry_date END) AS nearest_expiry,
  SUM(b.qty_on_hand * b.unit_cost)                     AS stock_value
FROM items i
LEFT JOIN batches b
       ON b.item_id = i.id
      AND b.is_quarantined = 0
WHERE i.is_active = 1
GROUP BY i.id, b.warehouse_id;

-- FEFO candidates for dispensing
CREATE VIEW v_sellable_batches AS
SELECT b.*
FROM batches b
JOIN items i ON i.id = b.item_id
WHERE b.qty_on_hand > 0
  AND b.is_quarantined = 0
  AND (i.no_expiry = 1 OR b.expiry_date > date('now'))
ORDER BY b.expiry_date ASC, b.id ASC;

-- ============================================================
-- SEED
-- ============================================================

INSERT INTO sequences (name, next_value) VALUES
  ('item_code', 100001),
  ('customer_code', 60001),
  ('supplier_code', 1001),
  ('sales_invoice', 1),
  ('sales_return', 1),
  ('purchase_invoice', 1),
  ('purchase_return', 1),
  ('narcotics', 1);

INSERT INTO warehouses (name_ar, is_default) VALUES ('المخزن الرئيسي', 1);

-- ------------------------------------------------------------
-- Deviation 2: ETA e-invoicing placeholders (decision D4)
-- ------------------------------------------------------------
ALTER TABLE sales_invoices ADD COLUMN eta_uuid   TEXT;
ALTER TABLE sales_invoices ADD COLUMN eta_status TEXT;
