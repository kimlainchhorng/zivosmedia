-- Car rental expense writes now go through car-rental-expense-manage.

ALTER TABLE public.car_rental_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_rental_expenses - insert"
  ON public.car_rental_expenses;
DROP POLICY IF EXISTS "Owners manage car_rental_expenses - update"
  ON public.car_rental_expenses;
DROP POLICY IF EXISTS "Owners manage car_rental_expenses - delete"
  ON public.car_rental_expenses;

CREATE POLICY "Car rental expense inserts require trusted server-side validation"
  ON public.car_rental_expenses
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental expense updates require trusted server-side validation"
  ON public.car_rental_expenses
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental expense deletes require trusted server-side validation"
  ON public.car_rental_expenses
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_expenses FROM anon, authenticated;
GRANT SELECT ON TABLE public.car_rental_expenses TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_expenses TO service_role;
