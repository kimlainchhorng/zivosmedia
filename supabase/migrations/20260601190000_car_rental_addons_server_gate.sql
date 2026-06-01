-- Car rental add-on writes now go through car-rental-addon-manage.

ALTER TABLE public.car_rental_addons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_rental_addons - insert"
  ON public.car_rental_addons;
DROP POLICY IF EXISTS "Owners manage car_rental_addons - update"
  ON public.car_rental_addons;
DROP POLICY IF EXISTS "Owners manage car_rental_addons - delete"
  ON public.car_rental_addons;

CREATE POLICY "Car rental add-on inserts require trusted server-side validation"
  ON public.car_rental_addons
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental add-on updates require trusted server-side validation"
  ON public.car_rental_addons
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental add-on deletes require trusted server-side validation"
  ON public.car_rental_addons
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_addons FROM anon, authenticated;
GRANT SELECT ON TABLE public.car_rental_addons TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_addons TO service_role;
