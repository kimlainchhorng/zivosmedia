-- Store payment setting writes now go through store-payment-settings-update,
-- preserving Stripe Connect fields as provider/webhook-controlled values.

ALTER TABLE public.store_payment_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can insert their payment settings"
  ON public.store_payment_settings;
DROP POLICY IF EXISTS "Owners can update their payment settings"
  ON public.store_payment_settings;

CREATE POLICY "Store payment settings inserts require trusted server-side validation"
  ON public.store_payment_settings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store payment settings updates require trusted server-side validation"
  ON public.store_payment_settings
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store payment settings deletes require trusted server-side validation"
  ON public.store_payment_settings
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_payment_settings FROM authenticated;
GRANT SELECT ON TABLE public.store_payment_settings TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.store_payment_settings TO service_role;
