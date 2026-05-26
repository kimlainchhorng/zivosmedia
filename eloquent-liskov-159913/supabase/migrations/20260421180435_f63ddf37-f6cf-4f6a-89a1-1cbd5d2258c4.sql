-- Driver Stripe Connect accounts
CREATE TABLE IF NOT EXISTS public.driver_stripe_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL DEFAULT 'US',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  charges_enabled BOOLEAN NOT NULL DEFAULT false,
  details_submitted BOOLEAN NOT NULL DEFAULT false,
  requirements JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.driver_stripe_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Driver views own stripe account" ON public.driver_stripe_accounts;
CREATE POLICY "Driver views own stripe account"
  ON public.driver_stripe_accounts FOR SELECT
  USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Service role manages stripe accounts" ON public.driver_stripe_accounts;
CREATE POLICY "Service role manages stripe accounts"
  ON public.driver_stripe_accounts FOR ALL
  USING (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('google','meta','tiktok')),
  external_id TEXT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  daily_budget_cents INTEGER NOT NULL DEFAULT 0,
  total_spend_cents INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view ad campaigns" ON public.ad_campaigns;
CREATE POLICY "Admins view ad campaigns"
  ON public.ad_campaigns FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage ad campaigns" ON public.ad_campaigns;
CREATE POLICY "Admins manage ad campaigns"
  ON public.ad_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.conversion_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  source TEXT NOT NULL,
  value_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  external_id TEXT,
  user_id UUID,
  payload JSONB,
  response JSONB,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view conversion events" ON public.conversion_events;
CREATE POLICY "Admins view conversion events"
  ON public.conversion_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service writes conversion events" ON public.conversion_events;
CREATE POLICY "Service writes conversion events"
  ON public.conversion_events FOR INSERT
  WITH CHECK (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ride_requests' AND column_name='stripe_payment_intent_id') THEN
    ALTER TABLE public.ride_requests ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ride_requests' AND column_name='captured_amount_cents') THEN
    ALTER TABLE public.ride_requests ADD COLUMN captured_amount_cents INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ride_requests' AND column_name='surcharge_amount_cents') THEN
    ALTER TABLE public.ride_requests ADD COLUMN surcharge_amount_cents INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ride_requests' AND column_name='eta_minutes') THEN
    ALTER TABLE public.ride_requests ADD COLUMN eta_minutes INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='ride_requests' AND column_name='eta_updated_at') THEN
    ALTER TABLE public.ride_requests ADD COLUMN eta_updated_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_platform ON public.ad_campaigns(platform);
CREATE INDEX IF NOT EXISTS idx_conversion_events_event_name ON public.conversion_events(event_name);
CREATE INDEX IF NOT EXISTS idx_conversion_events_sent_at ON public.conversion_events(sent_at DESC);

DROP TRIGGER IF EXISTS trg_driver_stripe_accounts_updated_at ON public.driver_stripe_accounts;
CREATE TRIGGER trg_driver_stripe_accounts_updated_at
  BEFORE UPDATE ON public.driver_stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_ad_campaigns_updated_at ON public.ad_campaigns;
CREATE TRIGGER trg_ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();