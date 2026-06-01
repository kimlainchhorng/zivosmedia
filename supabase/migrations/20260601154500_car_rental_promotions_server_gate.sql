-- Car-rental promo owner CRUD now goes through car-rental-promotion-manage.
-- Public active promo lookup remains read-only for booking validation.

ALTER TABLE public.car_rental_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_rental_promotions - insert"
  ON public.car_rental_promotions;
DROP POLICY IF EXISTS "Owners manage car_rental_promotions - update"
  ON public.car_rental_promotions;
DROP POLICY IF EXISTS "Owners manage car_rental_promotions - delete"
  ON public.car_rental_promotions;

CREATE POLICY "Car rental promotion inserts require trusted server-side validation"
  ON public.car_rental_promotions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental promotion updates require trusted server-side validation"
  ON public.car_rental_promotions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental promotion deletes require trusted server-side validation"
  ON public.car_rental_promotions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_promotions FROM authenticated;
GRANT SELECT ON TABLE public.car_rental_promotions TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_promotions TO service_role;
