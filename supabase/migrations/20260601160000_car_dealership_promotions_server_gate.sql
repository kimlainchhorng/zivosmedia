-- Car dealership promo owner CRUD now goes through car-dealership-promotion-manage.
-- Public active promo lookup remains read-only for listings.

ALTER TABLE public.car_dealership_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cd_promos_owner_insert"
  ON public.car_dealership_promotions;
DROP POLICY IF EXISTS "cd_promos_owner_update"
  ON public.car_dealership_promotions;
DROP POLICY IF EXISTS "cd_promos_owner_delete"
  ON public.car_dealership_promotions;

CREATE POLICY "Car dealership promotion inserts require trusted server-side validation"
  ON public.car_dealership_promotions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car dealership promotion updates require trusted server-side validation"
  ON public.car_dealership_promotions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car dealership promotion deletes require trusted server-side validation"
  ON public.car_dealership_promotions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_dealership_promotions FROM authenticated;
GRANT SELECT ON TABLE public.car_dealership_promotions TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_dealership_promotions TO service_role;
