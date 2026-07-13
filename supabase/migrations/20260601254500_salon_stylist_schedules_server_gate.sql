-- Gate stylist schedule mutations through salon-stylist-schedule-manage.
-- Public SELECT remains available for booking availability calculations.

ALTER TABLE public.salon_stylist_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage stylist schedules - all" ON public.salon_stylist_schedules;

DROP POLICY IF EXISTS "Owners read stylist schedules" ON public.salon_stylist_schedules;
CREATE POLICY "Owners read stylist schedules"
  ON public.salon_stylist_schedules
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_stylist_schedules.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon stylist schedule inserts require trusted server-side validation" ON public.salon_stylist_schedules;
CREATE POLICY "Salon stylist schedule inserts require trusted server-side validation"
  ON public.salon_stylist_schedules
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon stylist schedule updates require trusted server-side validation" ON public.salon_stylist_schedules;
CREATE POLICY "Salon stylist schedule updates require trusted server-side validation"
  ON public.salon_stylist_schedules
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon stylist schedule deletes require trusted server-side validation" ON public.salon_stylist_schedules;
CREATE POLICY "Salon stylist schedule deletes require trusted server-side validation"
  ON public.salon_stylist_schedules
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_stylist_schedules FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_stylist_schedules TO anon, authenticated;
GRANT ALL ON TABLE public.salon_stylist_schedules TO service_role;
