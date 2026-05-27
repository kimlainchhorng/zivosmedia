-- Cafe reviews — customer feedback on a specific order or the cafe in
-- general. Owner can reply once per review; the reply is shown beneath
-- the original on the storefront.

CREATE TABLE IF NOT EXISTS public.cafe_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.cafe_orders(id) ON DELETE SET NULL,

  -- Reviewer identity. user_id is set when posted via an authenticated
  -- session; the display name + photo are snapshotted so future profile
  -- changes don't rewrite the review.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  avatar_url TEXT,

  rating_stars SMALLINT NOT NULL CHECK (rating_stars BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),

  -- Optional tag for what's being reviewed: "drinks", "food", "service", etc.
  tags TEXT[] NOT NULL DEFAULT '{}',

  is_visible BOOLEAN NOT NULL DEFAULT true,
  owner_response TEXT CHECK (owner_response IS NULL OR char_length(owner_response) <= 2000),
  owner_response_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_reviews_store_idx
  ON public.cafe_reviews (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cafe_reviews_order_idx
  ON public.cafe_reviews (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cafe_reviews_unreplied_idx
  ON public.cafe_reviews (store_id) WHERE owner_response IS NULL AND is_visible = true;

DROP TRIGGER IF EXISTS cafe_reviews_set_updated_at ON public.cafe_reviews;
CREATE TRIGGER cafe_reviews_set_updated_at
  BEFORE UPDATE ON public.cafe_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

-- Stamp owner_response_at whenever owner_response transitions to non-null.
CREATE OR REPLACE FUNCTION public.tg_cafe_reviews_stamp_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_response IS DISTINCT FROM OLD.owner_response THEN
    IF NEW.owner_response IS NOT NULL AND length(trim(NEW.owner_response)) > 0 THEN
      NEW.owner_response_at := COALESCE(NEW.owner_response_at, now());
    ELSE
      NEW.owner_response_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_reviews_stamp_reply ON public.cafe_reviews;
CREATE TRIGGER cafe_reviews_stamp_reply
  BEFORE UPDATE OF owner_response ON public.cafe_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_reviews_stamp_reply();

ALTER TABLE public.cafe_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read visible reviews.
CREATE POLICY "Public reads visible cafe reviews"
  ON public.cafe_reviews
  FOR SELECT
  TO anon, authenticated
  USING (
    is_visible = true
    AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_reviews.store_id AND sp.is_active = true)
  );

-- Owners see everything, including hidden.
CREATE POLICY "Owners manage cafe reviews - all"
  ON public.cafe_reviews
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_reviews.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_reviews.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- A signed-in customer can post a review attributed to themselves.
CREATE POLICY "Customers can post their own cafe reviews"
  ON public.cafe_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
