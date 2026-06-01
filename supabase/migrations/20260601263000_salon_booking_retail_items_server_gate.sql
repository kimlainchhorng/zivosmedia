-- Gate owner/admin salon booking retail item mutations through salon-booking-retail-manage.
-- Reads stay available to authenticated owners/admins for booking, income,
-- history, and dashboard screens.

ALTER TABLE public.salon_booking_retail_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage booking retail items - all" ON public.salon_booking_retail_items;

DROP POLICY IF EXISTS "Owners read booking retail items" ON public.salon_booking_retail_items;
CREATE POLICY "Owners read booking retail items"
  ON public.salon_booking_retail_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.salon_bookings b
      JOIN public.store_profiles sp ON sp.id = b.store_id
      WHERE b.id = salon_booking_retail_items.booking_id
        AND (
          sp.owner_id = (SELECT auth.uid())
          OR public.has_role((SELECT auth.uid()), 'admin')
        )
    )
  );

DROP POLICY IF EXISTS "Salon booking retail item inserts require trusted server-side validation" ON public.salon_booking_retail_items;
CREATE POLICY "Salon booking retail item inserts require trusted server-side validation"
  ON public.salon_booking_retail_items
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon booking retail item updates require trusted server-side validation" ON public.salon_booking_retail_items;
CREATE POLICY "Salon booking retail item updates require trusted server-side validation"
  ON public.salon_booking_retail_items
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon booking retail item deletes require trusted server-side validation" ON public.salon_booking_retail_items;
CREATE POLICY "Salon booking retail item deletes require trusted server-side validation"
  ON public.salon_booking_retail_items
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_booking_retail_items FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_booking_retail_items TO authenticated;
GRANT ALL ON TABLE public.salon_booking_retail_items TO service_role;
