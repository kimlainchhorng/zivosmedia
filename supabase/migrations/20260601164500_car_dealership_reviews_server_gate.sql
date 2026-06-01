-- Car dealership review writes now go through car-dealership-review-submit and
-- car-dealership-review-manage. Visible review reads remain public.

ALTER TABLE public.car_dealership_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public submit dealership review"
  ON public.car_dealership_reviews;
DROP POLICY IF EXISTS "Owners manage car_dealership_reviews - insert"
  ON public.car_dealership_reviews;
DROP POLICY IF EXISTS "Owners manage car_dealership_reviews - update"
  ON public.car_dealership_reviews;
DROP POLICY IF EXISTS "Owners manage car_dealership_reviews - delete"
  ON public.car_dealership_reviews;
DROP POLICY IF EXISTS "car_dealership_reviews_insert_combined"
  ON public.car_dealership_reviews;

CREATE POLICY "Car dealership review inserts require trusted server-side validation"
  ON public.car_dealership_reviews
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Car dealership review updates require trusted server-side validation"
  ON public.car_dealership_reviews
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car dealership review deletes require trusted server-side validation"
  ON public.car_dealership_reviews
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_dealership_reviews FROM anon, authenticated;
GRANT SELECT ON TABLE public.car_dealership_reviews TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_dealership_reviews TO service_role;
