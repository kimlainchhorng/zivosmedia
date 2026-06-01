-- Car rental maintenance writes now go through car-rental-maintenance-manage.

ALTER TABLE public.car_rental_maintenance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_rental_maintenance - insert"
  ON public.car_rental_maintenance;
DROP POLICY IF EXISTS "Owners manage car_rental_maintenance - update"
  ON public.car_rental_maintenance;
DROP POLICY IF EXISTS "Owners manage car_rental_maintenance - delete"
  ON public.car_rental_maintenance;

CREATE POLICY "Car rental maintenance inserts require trusted server-side validation"
  ON public.car_rental_maintenance
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental maintenance updates require trusted server-side validation"
  ON public.car_rental_maintenance
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental maintenance deletes require trusted server-side validation"
  ON public.car_rental_maintenance
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_maintenance FROM anon, authenticated;
GRANT SELECT ON TABLE public.car_rental_maintenance TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_maintenance TO service_role;
