-- Car rental public checkout extras must be attached through a trusted Edge
-- Function that validates reservation confirmation code, store ownership, add-on
-- catalog state, and promotion limits before mutating checkout-side tables.

ALTER TABLE public.car_rental_reservation_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_rental_promo_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage reservation addons - all"
  ON public.car_rental_reservation_addons;
DROP POLICY IF EXISTS "Owners manage promo redemptions - all"
  ON public.car_rental_promo_redemptions;

CREATE POLICY "Owners and admins can read reservation addons"
  ON public.car_rental_reservation_addons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.car_rental_reservations r
      JOIN public.store_profiles sp ON sp.id = r.store_id
      WHERE r.id = car_rental_reservation_addons.reservation_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  );

CREATE POLICY "Owners and admins can read promo redemptions"
  ON public.car_rental_promo_redemptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.store_profiles sp
      WHERE sp.id = car_rental_promo_redemptions.store_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  );

CREATE POLICY "Car rental reservation add-on inserts require trusted server-side validation"
  ON public.car_rental_reservation_addons
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental reservation add-on updates require trusted server-side validation"
  ON public.car_rental_reservation_addons
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental reservation add-on deletes require trusted server-side validation"
  ON public.car_rental_reservation_addons
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

CREATE POLICY "Car rental promo redemption inserts require trusted server-side validation"
  ON public.car_rental_promo_redemptions
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car rental promo redemption updates require trusted server-side validation"
  ON public.car_rental_promo_redemptions
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car rental promo redemption deletes require trusted server-side validation"
  ON public.car_rental_promo_redemptions
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_reservation_addons FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_promo_redemptions FROM anon, authenticated;
GRANT SELECT ON TABLE public.car_rental_reservation_addons TO authenticated;
GRANT SELECT ON TABLE public.car_rental_promo_redemptions TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_reservation_addons TO service_role;
GRANT ALL PRIVILEGES ON TABLE public.car_rental_promo_redemptions TO service_role;
