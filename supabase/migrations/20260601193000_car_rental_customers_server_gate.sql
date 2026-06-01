-- Car rental renter-book owner writes now go through car-rental-customer-manage.

ALTER TABLE public.car_rental_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_rental_customers - insert"
  ON public.car_rental_customers;
DROP POLICY IF EXISTS "Owners manage car_rental_customers - update"
  ON public.car_rental_customers;
DROP POLICY IF EXISTS "Owners manage car_rental_customers - delete"
  ON public.car_rental_customers;

CREATE POLICY "Car rental customer inserts require trusted server-side validation"
  ON public.car_rental_customers
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental customer updates require trusted server-side validation"
  ON public.car_rental_customers
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental customer deletes require trusted server-side validation"
  ON public.car_rental_customers
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_customers FROM authenticated;
GRANT SELECT ON TABLE public.car_rental_customers TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_customers TO service_role;
