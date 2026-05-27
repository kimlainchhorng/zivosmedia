-- Payment configuration per store + market. Starting with the USA salon flow,
-- but the table is generic enough to extend to other store types and markets.

CREATE TABLE IF NOT EXISTS public.store_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  market TEXT NOT NULL DEFAULT 'us',

  -- Stripe Connect (status is set by the backend webhook / onboarding return URL).
  stripe_account_id TEXT,
  stripe_status TEXT NOT NULL DEFAULT 'not_connected'
    CHECK (stripe_status IN ('not_connected', 'pending', 'active', 'restricted')),

  -- Accepted payment methods at checkout.
  accept_card BOOLEAN NOT NULL DEFAULT true,
  accept_cash BOOLEAN NOT NULL DEFAULT true,

  -- Tips
  tips_enabled BOOLEAN NOT NULL DEFAULT true,
  tip_presets INTEGER[] NOT NULL DEFAULT ARRAY[15, 18, 20],
  tip_applies_pre_tax BOOLEAN NOT NULL DEFAULT true,

  -- Sales tax (USA: rates vary by state — owner enters their combined rate).
  tax_enabled BOOLEAN NOT NULL DEFAULT false,
  tax_rate NUMERIC(5, 3) NOT NULL DEFAULT 0
    CHECK (tax_rate >= 0 AND tax_rate <= 30),
  tax_label TEXT NOT NULL DEFAULT 'Sales tax',

  -- Booking policy
  deposit_percent INTEGER NOT NULL DEFAULT 0
    CHECK (deposit_percent >= 0 AND deposit_percent <= 100),
  no_show_fee_cents INTEGER NOT NULL DEFAULT 0
    CHECK (no_show_fee_cents >= 0),
  cancellation_window_hours INTEGER NOT NULL DEFAULT 24
    CHECK (cancellation_window_hours >= 0 AND cancellation_window_hours <= 168),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (store_id, market)
);

CREATE INDEX IF NOT EXISTS store_payment_settings_store_id_idx
  ON public.store_payment_settings (store_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.tg_store_payment_settings_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_payment_settings_set_updated_at ON public.store_payment_settings;
CREATE TRIGGER store_payment_settings_set_updated_at
  BEFORE UPDATE ON public.store_payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_store_payment_settings_set_updated_at();

-- RLS: owners manage their own row; admins manage any.
ALTER TABLE public.store_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can read their payment settings"
  ON public.store_payment_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_payment_settings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners can insert their payment settings"
  ON public.store_payment_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_payment_settings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners can update their payment settings"
  ON public.store_payment_settings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_payment_settings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_payment_settings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
