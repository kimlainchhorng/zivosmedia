-- Car-rental review writes now go through car-rental-review-submit and
-- car-rental-review-manage. Published review reads remain public.

ALTER TABLE public.car_rental_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_rental_reviews - insert"
  ON public.car_rental_reviews;
DROP POLICY IF EXISTS "Owners manage car_rental_reviews - update"
  ON public.car_rental_reviews;
DROP POLICY IF EXISTS "Owners manage car_rental_reviews - delete"
  ON public.car_rental_reviews;

CREATE POLICY "Car rental review inserts require trusted server-side validation"
  ON public.car_rental_reviews
  AS RESTRICTIVE
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental review updates require trusted server-side validation"
  ON public.car_rental_reviews
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental review deletes require trusted server-side validation"
  ON public.car_rental_reviews
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_reviews FROM anon, authenticated;
GRANT SELECT ON TABLE public.car_rental_reviews TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_reviews TO service_role;
