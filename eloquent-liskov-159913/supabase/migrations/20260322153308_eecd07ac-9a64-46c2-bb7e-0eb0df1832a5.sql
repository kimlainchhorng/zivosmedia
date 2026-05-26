-- Pre-computed AI smart deals cache for instant global delivery
CREATE TABLE IF NOT EXISTS public.ai_smart_deals_cache (
  id text PRIMARY KEY,
  category text NOT NULL,
  origin_code text NOT NULL,
  destination_code text NOT NULL,
  deal_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX idx_ai_smart_deals_cache_category ON public.ai_smart_deals_cache(category);
CREATE INDEX idx_ai_smart_deals_cache_expires ON public.ai_smart_deals_cache(expires_at);

ALTER TABLE public.ai_smart_deals_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached deals"
  ON public.ai_smart_deals_cache
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Cache metadata table for tracking refresh runs
CREATE TABLE IF NOT EXISTS public.ai_deals_refresh_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  routes_searched int DEFAULT 0,
  deals_cached int DEFAULT 0,
  status text DEFAULT 'running',
  error_message text
);

ALTER TABLE public.ai_deals_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read refresh logs"
  ON public.ai_deals_refresh_log
  FOR SELECT
  TO anon, authenticated
  USING (true);