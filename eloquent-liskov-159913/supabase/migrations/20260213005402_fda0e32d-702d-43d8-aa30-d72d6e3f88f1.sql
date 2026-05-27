
-- Add category rating columns, photo, and merchant reply to eats_reviews
ALTER TABLE public.eats_reviews 
  ADD COLUMN IF NOT EXISTS packaging_rating smallint,
  ADD COLUMN IF NOT EXISTS accuracy_rating smallint,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS merchant_reply text,
  ADD COLUMN IF NOT EXISTS merchant_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS tags text[],
  ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;

-- RLS: Allow restaurant owners to update reply on their reviews
CREATE POLICY "Restaurant owners can update reply on their reviews"
  ON public.eats_reviews
  FOR UPDATE
  TO authenticated
  USING (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    restaurant_id IN (
      SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
    )
  );

-- RLS: Public read for reviews
CREATE POLICY "Anyone can read reviews"
  ON public.eats_reviews
  FOR SELECT
  USING (true);

-- Index for restaurant reviews queries
CREATE INDEX IF NOT EXISTS idx_eats_reviews_restaurant_rating 
  ON public.eats_reviews(restaurant_id, rating, created_at DESC);
