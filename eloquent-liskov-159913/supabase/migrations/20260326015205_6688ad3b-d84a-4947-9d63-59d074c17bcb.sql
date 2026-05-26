ALTER TABLE store_products
  ADD COLUMN IF NOT EXISTS buy_quantity integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS get_quantity integer DEFAULT 0;