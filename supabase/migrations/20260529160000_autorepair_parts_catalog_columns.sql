-- Auto-repair Parts catalog: add the columns the Parts form & picker rely on.
--
-- AutoRepairPartShopSection inserts cost_cents, core_charge_cents, condition,
-- oem_number, interchange_number, warranty_months, fitment_notes,
-- location_in_store, and PartPickerDialog selects oem_number/condition/
-- fitment_notes — but ar_parts never had these columns, so every "add part"
-- insert failed and the catalog stayed empty. Add them (additive, safe).

ALTER TABLE public.ar_parts
  ADD COLUMN IF NOT EXISTS cost_cents         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS core_charge_cents  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS condition          TEXT NOT NULL DEFAULT 'New',
  ADD COLUMN IF NOT EXISTS oem_number         TEXT,
  ADD COLUMN IF NOT EXISTS interchange_number TEXT,
  ADD COLUMN IF NOT EXISTS warranty_months    INTEGER,
  ADD COLUMN IF NOT EXISTS fitment_notes      TEXT,
  ADD COLUMN IF NOT EXISTS location_in_store  TEXT;

-- The CSV bulk-import path upserts on (store_id, sku); back it with a constraint.
ALTER TABLE public.ar_parts
  ADD CONSTRAINT ar_parts_store_sku_unique UNIQUE (store_id, sku);
