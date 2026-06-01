-- Lodging review writes now go through lodging-review-submit and
-- lodging-review-manage. Non-flagged review reads remain public.

ALTER TABLE public.lodging_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can insert lodging_reviews"
  ON public.lodging_reviews;
DROP POLICY IF EXISTS "Owners can update lodging_reviews"
  ON public.lodging_reviews;
DROP POLICY IF EXISTS "Owners can delete lodging_reviews"
  ON public.lodging_reviews;

CREATE POLICY "Lodging review inserts require trusted server-side validation"
  ON public.lodging_reviews
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Lodging review updates require trusted server-side validation"
  ON public.lodging_reviews
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Lodging review deletes require trusted server-side validation"
  ON public.lodging_reviews
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.lodging_reviews FROM anon, authenticated;
GRANT SELECT ON TABLE public.lodging_reviews TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.lodging_reviews TO service_role;
