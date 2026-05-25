-- Sales tax for cafe orders.
-- Adds a per-store rate in basis points (10000 = 100%, so 825 = 8.25%) to
-- cafe_settings and extends the order-total trigger to auto-compute
-- tax_cents whenever subtotal or discount changes.

ALTER TABLE public.cafe_settings
  ADD COLUMN IF NOT EXISTS tax_rate_bp integer NOT NULL DEFAULT 0
    CHECK (tax_rate_bp >= 0 AND tax_rate_bp <= 5000);

CREATE OR REPLACE FUNCTION public.tg_cafe_orders_recompute_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_rate_bp INTEGER := 0;
BEGIN
  -- Recompute tax_cents from the store's tax_rate_bp whenever the taxable
  -- amount (subtotal - discount) could have changed. Tax_cents is the
  -- floor of (subtotal-discount) * rate / 10000 in cents.
  IF TG_OP = 'INSERT'
     OR NEW.subtotal_cents IS DISTINCT FROM OLD.subtotal_cents
     OR NEW.discount_cents IS DISTINCT FROM OLD.discount_cents THEN
    SELECT COALESCE(tax_rate_bp, 0) INTO v_rate_bp
      FROM public.cafe_settings WHERE store_id = NEW.store_id;
    NEW.tax_cents := FLOOR(GREATEST(NEW.subtotal_cents - NEW.discount_cents, 0) * v_rate_bp::numeric / 10000)::INTEGER;
  END IF;
  NEW.total_cents := GREATEST(NEW.subtotal_cents - NEW.discount_cents, 0)
    + NEW.tax_cents + NEW.tip_cents;
  RETURN NEW;
END;
$$;
