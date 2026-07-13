-- Auto-repair: end-to-end sales tax + payment-status fix
--
-- 1. Persist a per-invoice tax rate so an estimate's rate survives conversion
--    and invoices can compute/store tax (ar_estimates already has tax_rate).
-- 2. Add a shop-level default tax rate (ar_shop_settings) that prefills new
--    estimates/invoices; each document can still override it.
-- 3. Fix ar_recalc_invoice_payment(): it wrote status = 'partial', but the
--    entire app/UI expects 'partially_paid'. Correct it and backfill rows.

-- 1) Per-invoice tax rate ----------------------------------------------------
ALTER TABLE public.ar_invoices
  ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0;

-- 2) Shop-level settings (default tax rate + label) --------------------------
CREATE TABLE IF NOT EXISTS public.ar_shop_settings (
  store_id UUID PRIMARY KEY,
  default_tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
  tax_label TEXT NOT NULL DEFAULT 'Sales Tax',
  tax_registration_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ar_shop_settings ENABLE ROW LEVEL SECURITY;

-- Mirror the existing ar_ table policy pattern (restaurants.owner_id + admin).
DROP POLICY IF EXISTS "Owners manage their ar_shop_settings" ON public.ar_shop_settings;
CREATE POLICY "Owners manage their ar_shop_settings" ON public.ar_shop_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = ar_shop_settings.store_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = ar_shop_settings.store_id AND r.owner_id = auth.uid()));
DROP POLICY IF EXISTS "Admins manage all ar_shop_settings" ON public.ar_shop_settings;
CREATE POLICY "Admins manage all ar_shop_settings" ON public.ar_shop_settings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));

DROP TRIGGER IF EXISTS trg_ar_shop_settings_updated ON public.ar_shop_settings;
CREATE TRIGGER trg_ar_shop_settings_updated
  BEFORE UPDATE ON public.ar_shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Payment-status fix ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ar_recalc_invoice_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_total INTEGER;
  v_paid INTEGER;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT total_cents INTO v_total FROM public.ar_invoices WHERE id = v_invoice_id;
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_paid
    FROM public.ar_invoice_payments WHERE invoice_id = v_invoice_id;

  UPDATE public.ar_invoices
  SET amount_paid_cents = v_paid,
      status = CASE
        WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'
        WHEN v_paid > 0 THEN 'partially_paid'
        ELSE status
      END,
      paid_at = CASE
        WHEN v_paid >= v_total AND v_total > 0 THEN now()
        ELSE paid_at
      END
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Backfill any rows the old trigger left as 'partial'.
UPDATE public.ar_invoices SET status = 'partially_paid' WHERE status = 'partial';
