-- Restore anonymous analytics inserts needed by public pages.
DO $$
BEGIN
  IF to_regclass('public.analytics_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS "analytics_insert_anon" ON public.analytics_events;
    CREATE POLICY "analytics_insert_anon"
    ON public.analytics_events
    FOR INSERT
    TO anon
    WITH CHECK (user_id IS NULL);

    DROP POLICY IF EXISTS "analytics_insert_auth" ON public.analytics_events;
    CREATE POLICY "analytics_insert_auth"
    ON public.analytics_events
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
  END IF;
END $$;

-- Create the missing Social-to-Sale reel links table used by the feed.
CREATE TABLE IF NOT EXISTS public.social_reel_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  post_source TEXT NOT NULL CHECK (post_source IN ('store', 'user')),
  link_type TEXT NOT NULL CHECK (link_type IN ('store_product', 'truck_sale')),
  store_id UUID REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  store_product_id UUID REFERENCES public.store_products(id) ON DELETE CASCADE,
  truck_sale_id UUID,
  checkout_path TEXT,
  map_lat DOUBLE PRECISION,
  map_lng DOUBLE PRECISION,
  map_label TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_reel_links_post ON public.social_reel_links(post_id, post_source);
CREATE INDEX IF NOT EXISTS idx_social_reel_links_store_product ON public.social_reel_links(store_product_id);
CREATE INDEX IF NOT EXISTS idx_social_reel_links_truck_sale ON public.social_reel_links(truck_sale_id);

ALTER TABLE public.social_reel_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read social reel links" ON public.social_reel_links;
CREATE POLICY "Anyone can read social reel links"
ON public.social_reel_links
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can create reel links" ON public.social_reel_links;
CREATE POLICY "Authenticated users can create reel links"
ON public.social_reel_links
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Creators can update own reel links" ON public.social_reel_links;
CREATE POLICY "Creators can update own reel links"
ON public.social_reel_links
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

DROP TRIGGER IF EXISTS update_social_reel_links_updated_at ON public.social_reel_links;
CREATE TRIGGER update_social_reel_links_updated_at
BEFORE UPDATE ON public.social_reel_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();