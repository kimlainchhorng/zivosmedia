ALTER TABLE store_products
  ADD COLUMN IF NOT EXISTS discount_type text CHECK (discount_type IN ('percentage', 'fixed')) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_value numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_price_khr numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS discount_expires_at timestamptz DEFAULT NULL;