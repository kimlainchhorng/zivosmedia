-- Phase 4: Budget pacing & spend caps per platform
CREATE TABLE IF NOT EXISTS public.ads_studio_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('google','meta','tiktok','youtube','all')),
  daily_cap_cents integer NOT NULL DEFAULT 0,
  monthly_cap_cents integer NOT NULL DEFAULT 0,
  pacing text NOT NULL DEFAULT 'even' CHECK (pacing IN ('even','accelerated','front_loaded')),
  is_paused boolean NOT NULL DEFAULT false,
  paused_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (store_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_ads_studio_budgets_store ON public.ads_studio_budgets(store_id);

ALTER TABLE public.ads_studio_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners manage their budgets"
ON public.ads_studio_budgets
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = ads_studio_budgets.store_id AND r.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = ads_studio_budgets.store_id AND r.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Daily spend rollup (denormalized for fast pacing checks)
CREATE TABLE IF NOT EXISTS public.ads_studio_daily_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  platform text NOT NULL,
  spend_date date NOT NULL,
  spend_cents integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, platform, spend_date)
);

CREATE INDEX IF NOT EXISTS idx_ads_studio_daily_spend_lookup ON public.ads_studio_daily_spend(store_id, spend_date DESC);

ALTER TABLE public.ads_studio_daily_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners view daily spend"
ON public.ads_studio_daily_spend
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = ads_studio_daily_spend.store_id AND r.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "System inserts daily spend"
ON public.ads_studio_daily_spend
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System updates daily spend"
ON public.ads_studio_daily_spend
FOR UPDATE
USING (true);

-- Updated_at trigger
CREATE TRIGGER trg_ads_studio_budgets_updated
BEFORE UPDATE ON public.ads_studio_budgets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Winner history view: latest auto-winner picks
CREATE OR REPLACE VIEW public.ads_studio_winner_history AS
SELECT
  v.id AS variant_id,
  v.creative_id,
  v.store_id,
  v.variant_label,
  v.headline,
  v.cta,
  v.image_url,
  v.is_winner,
  v.created_at AS variant_created_at,
  c.goal,
  c.auto_winner_at,
  c.auto_winner_picked
FROM public.ads_studio_variants v
JOIN public.ads_studio_creatives c ON c.id = v.creative_id
WHERE v.is_winner = true
ORDER BY c.auto_winner_at DESC NULLS LAST;