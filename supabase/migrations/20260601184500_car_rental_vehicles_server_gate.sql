-- Car rental vehicle writes now go through car-rental-vehicle-manage.

ALTER TABLE public.car_rental_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_rental_vehicles - insert"
  ON public.car_rental_vehicles;
DROP POLICY IF EXISTS "Owners manage car_rental_vehicles - update"
  ON public.car_rental_vehicles;
DROP POLICY IF EXISTS "Owners manage car_rental_vehicles - delete"
  ON public.car_rental_vehicles;

CREATE POLICY "Car rental vehicle inserts require trusted server-side validation"
  ON public.car_rental_vehicles
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental vehicle updates require trusted server-side validation"
  ON public.car_rental_vehicles
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental vehicle deletes require trusted server-side validation"
  ON public.car_rental_vehicles
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_vehicles FROM anon, authenticated;
GRANT SELECT ON TABLE public.car_rental_vehicles TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_vehicles TO service_role;
