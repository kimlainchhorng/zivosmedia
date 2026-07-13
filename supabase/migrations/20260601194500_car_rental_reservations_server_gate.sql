-- Car rental owner reservation writes now go through car-rental-reservation-manage.

ALTER TABLE public.car_rental_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_rental_reservations - insert"
  ON public.car_rental_reservations;
DROP POLICY IF EXISTS "Owners manage car_rental_reservations - update"
  ON public.car_rental_reservations;
DROP POLICY IF EXISTS "Owners manage car_rental_reservations - delete"
  ON public.car_rental_reservations;

CREATE POLICY "Car rental reservation inserts require trusted server-side validation"
  ON public.car_rental_reservations
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental reservation updates require trusted server-side validation"
  ON public.car_rental_reservations
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental reservation deletes require trusted server-side validation"
  ON public.car_rental_reservations
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_reservations FROM authenticated;
GRANT SELECT ON TABLE public.car_rental_reservations TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_reservations TO service_role;
