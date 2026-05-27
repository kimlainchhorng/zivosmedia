
-- Helper: store ownership check (uses restaurants.owner_id)
CREATE OR REPLACE FUNCTION public.user_owns_store(_store_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants WHERE id = _store_id AND owner_id = _user_id
  );
$$;

-- 1) Platform connections
CREATE TABLE IF NOT EXISTS public.store_ad_platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('meta','google','tiktok','x')),
  account_id text,
  account_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[],
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','expired','disconnected','pending')),
  last_synced_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, platform)
);
ALTER TABLE public.store_ad_platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sapc_select" ON public.store_ad_platform_connections FOR SELECT
  USING (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sapc_all" ON public.store_ad_platform_connections FOR ALL
  USING (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_sapc_store ON public.store_ad_platform_connections(store_id);

-- 2) Ads Studio wallet
CREATE TABLE IF NOT EXISTS public.ads_studio_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0,
  auto_recharge_enabled boolean NOT NULL DEFAULT false,
  threshold_cents integer NOT NULL DEFAULT 1000,
  recharge_amount_cents integer NOT NULL DEFAULT 5000,
  stripe_customer_id text,
  stripe_payment_method_id text,
  last_recharge_at timestamptz,
  last_recharge_failed_at timestamptz,
  last_recharge_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ads_studio_wallet ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asw_select" ON public.ads_studio_wallet FOR SELECT
  USING (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "asw_update" ON public.ads_studio_wallet FOR UPDATE
  USING (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "asw_insert" ON public.ads_studio_wallet FOR INSERT
  WITH CHECK (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- 3) Wallet ledger
CREATE TABLE IF NOT EXISTS public.ads_wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('topup','spend','refund','auto_recharge','adjustment')),
  amount_cents integer NOT NULL,
  balance_after_cents integer NOT NULL,
  ref_type text,
  ref_id text,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ads_wallet_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "awl_select" ON public.ads_wallet_ledger FOR SELECT
  USING (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_awl_store_created ON public.ads_wallet_ledger(store_id, created_at DESC);

-- 4) Saved audiences
CREATE TABLE IF NOT EXISTS public.store_ad_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_reach integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_ad_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saa_all" ON public.store_ad_audiences FOR ALL
  USING (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX IF NOT EXISTS idx_saa_store ON public.store_ad_audiences(store_id);

-- 5) Platform access waitlist
CREATE TABLE IF NOT EXISTS public.ad_platform_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('tiktok','x','meta','google')),
  contact_email text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ad_platform_access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apar_select" ON public.ad_platform_access_requests FOR SELECT
  USING (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "apar_insert" ON public.ad_platform_access_requests FOR INSERT
  WITH CHECK (public.user_owns_store(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "apar_update_admin" ON public.ad_platform_access_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 6) OAuth state nonces (service-role only)
CREATE TABLE IF NOT EXISTS public.oauth_state_nonces (
  state text PRIMARY KEY,
  store_id uuid NOT NULL,
  user_id uuid NOT NULL,
  platform text NOT NULL,
  return_url text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.oauth_state_nonces ENABLE ROW LEVEL SECURITY;

-- 7) Extend ads_studio_creatives
ALTER TABLE public.ads_studio_creatives
  ADD COLUMN IF NOT EXISTS schedule_start timestamptz,
  ADD COLUMN IF NOT EXISTS schedule_end timestamptz,
  ADD COLUMN IF NOT EXISTS daypart_windows jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_winner_threshold_impressions integer DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS auto_winner_metric text DEFAULT 'ctr',
  ADD COLUMN IF NOT EXISTS audience_id uuid REFERENCES public.store_ad_audiences(id) ON DELETE SET NULL;

-- 8) Updated_at triggers
DROP TRIGGER IF EXISTS trg_sapc_updated_at ON public.store_ad_platform_connections;
CREATE TRIGGER trg_sapc_updated_at BEFORE UPDATE ON public.store_ad_platform_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_asw_updated_at ON public.ads_studio_wallet;
CREATE TRIGGER trg_asw_updated_at BEFORE UPDATE ON public.ads_studio_wallet
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_saa_updated_at ON public.store_ad_audiences;
CREATE TRIGGER trg_saa_updated_at BEFORE UPDATE ON public.store_ad_audiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
