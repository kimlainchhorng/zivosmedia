-- Owner/admin cafe review writes now go through cafe-review-manage.
-- Customer order-linked review submission continues through cafe_submit_public_review.

ALTER TABLE public.cafe_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage cafe reviews - all"
  ON public.cafe_reviews;
DROP POLICY IF EXISTS "Customers can post their own cafe reviews"
  ON public.cafe_reviews;

CREATE POLICY "Cafe review inserts require trusted server-side validation"
  ON public.cafe_reviews
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Cafe review updates require trusted server-side validation"
  ON public.cafe_reviews
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Cafe review deletes require trusted server-side validation"
  ON public.cafe_reviews
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.cafe_reviews FROM anon, authenticated;
GRANT SELECT ON TABLE public.cafe_reviews TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.cafe_reviews TO service_role;
