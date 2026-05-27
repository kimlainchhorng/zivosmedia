-- Attribution: link orders to ad clicks
ALTER TABLE public.food_orders
  ADD COLUMN IF NOT EXISTS ads_click_id uuid,
  ADD COLUMN IF NOT EXISTS ads_creative_id uuid,
  ADD COLUMN IF NOT EXISTS ads_variant_id uuid,
  ADD COLUMN IF NOT EXISTS ads_platform text;

CREATE INDEX IF NOT EXISTS idx_food_orders_ads_creative ON public.food_orders(ads_creative_id) WHERE ads_creative_id IS NOT NULL;

-- Auto-pause notification dedupe
ALTER TABLE public.ads_studio_budgets
  ADD COLUMN IF NOT EXISTS pause_notified_at timestamptz;

-- AI-generated recommendations
CREATE TABLE IF NOT EXISTS public.ads_studio_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  recommendation_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  estimated_impact text,
  source_metrics jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','accepted','dismissed')),
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_recommendations_store ON public.ads_studio_recommendations(store_id, created_at DESC);

ALTER TABLE public.ads_studio_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view their recommendations"
ON public.ads_studio_recommendations
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ads_studio_recommendations.store_id AND r.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Owners update their recommendations"
ON public.ads_studio_recommendations
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ads_studio_recommendations.store_id AND r.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ads_studio_recommendations.store_id AND r.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins insert recommendations"
ON public.ads_studio_recommendations
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));