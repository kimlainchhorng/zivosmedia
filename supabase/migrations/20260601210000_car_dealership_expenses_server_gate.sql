-- Dealership expenses affect owner reporting and vehicle economics, so writes
-- must go through trusted owner/admin server-side validation.

ALTER TABLE public.car_dealership_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_dealership_expenses - insert"
  ON public.car_dealership_expenses;
DROP POLICY IF EXISTS "Owners manage car_dealership_expenses - update"
  ON public.car_dealership_expenses;
DROP POLICY IF EXISTS "Owners manage car_dealership_expenses - delete"
  ON public.car_dealership_expenses;

CREATE POLICY "Car dealership expense inserts require trusted server-side validation"
  ON public.car_dealership_expenses
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car dealership expense updates require trusted server-side validation"
  ON public.car_dealership_expenses
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car dealership expense deletes require trusted server-side validation"
  ON public.car_dealership_expenses
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_dealership_expenses FROM authenticated;
GRANT SELECT ON TABLE public.car_dealership_expenses TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_dealership_expenses TO service_role;
