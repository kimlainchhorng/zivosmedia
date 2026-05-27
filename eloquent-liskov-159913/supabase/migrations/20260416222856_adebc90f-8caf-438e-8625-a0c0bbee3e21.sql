
-- External ad platforms: connection accounts + campaigns per store
CREATE TYPE public.ad_platform AS ENUM ('meta','instagram','google','tiktok','x');
CREATE TYPE public.ad_account_status AS ENUM ('disconnected','pending','connected','error');
CREATE TYPE public.ad_campaign_status AS ENUM ('draft','pending_review','active','paused','ended','rejected');

CREATE TABLE public.store_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform public.ad_platform NOT NULL,
  status public.ad_account_status NOT NULL DEFAULT 'disconnected',
  external_account_id text,
  display_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at timestamptz,
  connected_at timestamptz,
  connected_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, platform)
);

CREATE TABLE public.store_ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  objective text NOT NULL DEFAULT 'traffic',
  platforms public.ad_platform[] NOT NULL DEFAULT '{}',
  status public.ad_campaign_status NOT NULL DEFAULT 'draft',
  daily_budget_cents integer NOT NULL DEFAULT 0,
  total_budget_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  start_date timestamptz,
  end_date timestamptz,
  headline text,
  body text,
  cta text DEFAULT 'Learn More',
  destination_url text,
  creative_url text,
  targeting jsonb NOT NULL DEFAULT '{}'::jsonb,
  external_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  spend_cents integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_ad_accounts_store ON public.store_ad_accounts(store_id);
CREATE INDEX idx_store_ad_campaigns_store ON public.store_ad_campaigns(store_id);
CREATE INDEX idx_store_ad_campaigns_status ON public.store_ad_campaigns(status);

ALTER TABLE public.store_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Owners and admins can fully manage their store's ad accounts
CREATE POLICY "Owner or admin manage ad accounts"
  ON public.store_ad_accounts FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = store_ad_accounts.store_id AND r.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = store_ad_accounts.store_id AND r.owner_id = auth.uid())
  );

CREATE POLICY "Owner or admin manage ad campaigns"
  ON public.store_ad_campaigns FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = store_ad_campaigns.store_id AND r.owner_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = store_ad_campaigns.store_id AND r.owner_id = auth.uid())
  );

CREATE TRIGGER trg_store_ad_accounts_updated
  BEFORE UPDATE ON public.store_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_store_ad_campaigns_updated
  BEFORE UPDATE ON public.store_ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
