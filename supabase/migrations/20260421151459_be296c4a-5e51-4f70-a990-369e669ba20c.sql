
-- Phase 2 Ads Studio: variants, analytics, wallet guards

-- 1) Variants table (A/B testing). Each creative can have multiple variants.
CREATE TABLE IF NOT EXISTS public.ads_studio_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID NOT NULL REFERENCES public.ads_studio_creatives(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  variant_label TEXT NOT NULL,
  headline TEXT,
  description TEXT,
  image_url TEXT,
  cta TEXT,
  is_winner BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_studio_variants_creative ON public.ads_studio_variants(creative_id);

ALTER TABLE public.ads_studio_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their variants"
  ON public.ads_studio_variants FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ads_studio_variants.store_id AND r.owner_id = auth.uid()));

CREATE POLICY "Owners insert their variants"
  ON public.ads_studio_variants FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ads_studio_variants.store_id AND r.owner_id = auth.uid()));

CREATE POLICY "Owners update their variants"
  ON public.ads_studio_variants FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ads_studio_variants.store_id AND r.owner_id = auth.uid()));

CREATE POLICY "Owners delete their variants"
  ON public.ads_studio_variants FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ads_studio_variants.store_id AND r.owner_id = auth.uid()));

-- 2) Analytics events table (clicks/impressions/conversions tracked via UTM landing pixel)
CREATE TABLE IF NOT EXISTS public.ads_studio_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id UUID REFERENCES public.ads_studio_creatives(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.ads_studio_variants(id) ON DELETE SET NULL,
  store_id UUID NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('click','impression','conversion','signup')),
  revenue_cents INTEGER DEFAULT 0,
  user_id UUID,
  ip_hash TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_studio_events_creative ON public.ads_studio_events(creative_id);
CREATE INDEX IF NOT EXISTS idx_ads_studio_events_store ON public.ads_studio_events(store_id);
CREATE INDEX IF NOT EXISTS idx_ads_studio_events_created ON public.ads_studio_events(created_at DESC);

ALTER TABLE public.ads_studio_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their events"
  ON public.ads_studio_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ads_studio_events.store_id AND r.owner_id = auth.uid()));

-- Public insert (tracking pixel) — anyone can record an event, but only for valid creatives
CREATE POLICY "Anyone can insert events"
  ON public.ads_studio_events FOR INSERT
  WITH CHECK (creative_id IS NOT NULL OR store_id IS NOT NULL);

-- 3) Auto-recharge settings on wallet (additive columns; no constraint changes)
ALTER TABLE public.restaurant_wallets
  ADD COLUMN IF NOT EXISTS auto_recharge_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_recharge_threshold_cents INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS auto_recharge_amount_cents INTEGER DEFAULT 2000;

-- 4) Aggregate view for the analytics dashboard
CREATE OR REPLACE VIEW public.ads_studio_creative_stats AS
SELECT
  c.id AS creative_id,
  c.store_id,
  c.goal,
  c.status,
  c.created_at,
  COALESCE(SUM(CASE WHEN e.event_type='impression' THEN 1 ELSE 0 END),0)::int AS impressions,
  COALESCE(SUM(CASE WHEN e.event_type='click' THEN 1 ELSE 0 END),0)::int AS clicks,
  COALESCE(SUM(CASE WHEN e.event_type='conversion' THEN 1 ELSE 0 END),0)::int AS conversions,
  COALESCE(SUM(e.revenue_cents),0)::int AS revenue_cents,
  COALESCE(SUM(g.cost_cents),0)::int AS spend_cents
FROM public.ads_studio_creatives c
LEFT JOIN public.ads_studio_events e ON e.creative_id = c.id
LEFT JOIN public.ads_studio_generations g ON g.creative_id = c.id
GROUP BY c.id;

GRANT SELECT ON public.ads_studio_creative_stats TO authenticated;
