-- Car rental store settings writes now go through car-rental-settings-update.

ALTER TABLE public.car_rental_store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_rental_store_settings - insert"
  ON public.car_rental_store_settings;
DROP POLICY IF EXISTS "Owners manage car_rental_store_settings - update"
  ON public.car_rental_store_settings;
DROP POLICY IF EXISTS "Owners manage car_rental_store_settings - delete"
  ON public.car_rental_store_settings;
DROP POLICY IF EXISTS "Owners manage car_rental_store_settings - all"
  ON public.car_rental_store_settings;

CREATE POLICY "Car rental store settings owner/admin read"
  ON public.car_rental_store_settings
  FOR SELECT
  TO authenticated
  USING (
    public.has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = car_rental_store_settings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Public read car rental store settings"
  ON public.car_rental_store_settings
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Car rental store settings inserts require trusted server-side validation"
  ON public.car_rental_store_settings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental store settings updates require trusted server-side validation"
  ON public.car_rental_store_settings
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental store settings deletes require trusted server-side validation"
  ON public.car_rental_store_settings
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_store_settings FROM authenticated;
GRANT SELECT ON TABLE public.car_rental_store_settings TO anon, authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_store_settings TO service_role;
