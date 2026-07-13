-- Car rental blackout writes now go through car-rental-blackout-manage.

ALTER TABLE public.car_rental_vehicle_blackouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage blackouts - insert"
  ON public.car_rental_vehicle_blackouts;
DROP POLICY IF EXISTS "Owners manage blackouts - update"
  ON public.car_rental_vehicle_blackouts;
DROP POLICY IF EXISTS "Owners manage blackouts - delete"
  ON public.car_rental_vehicle_blackouts;

CREATE POLICY "Car rental blackout inserts require trusted server-side validation"
  ON public.car_rental_vehicle_blackouts
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental blackout updates require trusted server-side validation"
  ON public.car_rental_vehicle_blackouts
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental blackout deletes require trusted server-side validation"
  ON public.car_rental_vehicle_blackouts
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_vehicle_blackouts FROM authenticated;
GRANT SELECT ON TABLE public.car_rental_vehicle_blackouts TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_vehicle_blackouts TO service_role;
