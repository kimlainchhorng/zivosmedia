-- Marketplace review writes now go through marketplace-review-submit.
-- Public review reads remain available for seller reputation surfaces.

ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own reviews"
  ON public.marketplace_reviews;
DROP POLICY IF EXISTS "Users update own reviews"
  ON public.marketplace_reviews;

CREATE POLICY "Marketplace review inserts require trusted server-side validation"
  ON public.marketplace_reviews
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Marketplace review updates require trusted server-side validation"
  ON public.marketplace_reviews
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Marketplace review deletes require trusted server-side validation"
  ON public.marketplace_reviews
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.marketplace_reviews FROM anon, authenticated;
GRANT SELECT ON TABLE public.marketplace_reviews TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.marketplace_reviews TO service_role;
