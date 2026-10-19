-- ============================================================
-- Migration 0013 — find items by their international code
--
-- The international code (الكود الدولي) is the EAN printed on the box.
-- Scanning it at the till and searching for it must find the item exactly
-- like an entry in item_barcodes; this index keeps that lookup instant.
-- Stored codes are normalised to ASCII digits without spaces (codes typed
-- on an Arabic keyboard layout were saved with Arabic-Indic digits and
-- could never match a scan).
-- ============================================================

UPDATE items
   SET international_code = NULLIF(
         REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
           REPLACE(TRIM(international_code), ' ', ''),
           '٠','0'),'١','1'),'٢','2'),'٣','3'),'٤','4'),'٥','5'),'٦','6'),'٧','7'),'٨','8'),'٩','9'),
         '')
 WHERE international_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_items_international_code ON items(international_code);
