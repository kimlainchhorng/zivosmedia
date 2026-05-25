-- salon_retail_products.sku is meant to be a unique product code per store
-- (the owner enters it for inventory tracking and reconciliation against
-- supplier order forms). Without a uniqueness constraint, two rows in the
-- same store could share the same SKU — making "look up by SKU" ambiguous
-- and breaking stock-take workflows.
--
-- Partial unique index so NULL SKUs (owner hasn't entered one yet) don't
-- collide with each other. CONCURRENTLY would be nicer for production but
-- the supabase CLI doesn't support that in migrations, and salon_retail
-- tables are small.

CREATE UNIQUE INDEX IF NOT EXISTS salon_retail_products_store_sku_unique
  ON public.salon_retail_products (store_id, sku)
  WHERE sku IS NOT NULL;
