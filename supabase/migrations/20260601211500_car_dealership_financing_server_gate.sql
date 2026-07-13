-- Dealership financing applications contain customer finance workflow data.
-- Owner/admin writes must go through trusted server-side validation.

ALTER TABLE public.car_dealership_financing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_dealership_financing - insert"
  ON public.car_dealership_financing;
DROP POLICY IF EXISTS "Owners manage car_dealership_financing - update"
  ON public.car_dealership_financing;
DROP POLICY IF EXISTS "Owners manage car_dealership_financing - delete"
  ON public.car_dealership_financing;

CREATE POLICY "Car dealership financing inserts require trusted server-side validation"
  ON public.car_dealership_financing
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car dealership financing updates require trusted server-side validation"
  ON public.car_dealership_financing
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car dealership financing deletes require trusted server-side validation"
  ON public.car_dealership_financing
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_dealership_financing FROM authenticated;
GRANT SELECT ON TABLE public.car_dealership_financing TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_dealership_financing TO service_role;
