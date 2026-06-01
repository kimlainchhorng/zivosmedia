-- Salon owner/admin review moderation now goes through salon-review-manage.
-- Public completed-booking review submission remains on salon_public_submit_review.

ALTER TABLE public.salon_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage reviews - all"
  ON public.salon_reviews;

CREATE POLICY "Salon review inserts require trusted server-side validation"
  ON public.salon_reviews
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Salon review updates require trusted server-side validation"
  ON public.salon_reviews
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Salon review deletes require trusted server-side validation"
  ON public.salon_reviews
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_reviews FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_reviews TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.salon_reviews TO service_role;
