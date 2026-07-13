-- Car rental location writes now go through car-rental-location-manage.

ALTER TABLE public.car_rental_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_rental_locations - insert"
  ON public.car_rental_locations;
DROP POLICY IF EXISTS "Owners manage car_rental_locations - update"
  ON public.car_rental_locations;
DROP POLICY IF EXISTS "Owners manage car_rental_locations - delete"
  ON public.car_rental_locations;

CREATE POLICY "Car rental location inserts require trusted server-side validation"
  ON public.car_rental_locations
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental location updates require trusted server-side validation"
  ON public.car_rental_locations
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental location deletes require trusted server-side validation"
  ON public.car_rental_locations
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_locations FROM anon, authenticated;
GRANT SELECT ON TABLE public.car_rental_locations TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_locations TO service_role;
