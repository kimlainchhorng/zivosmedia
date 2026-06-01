-- Gate owner/admin salon time-entry mutations through salon-time-entry-manage.
-- Stylist self-service clock-in/out continues through SECURITY DEFINER RPCs:
-- salon_public_stylist_clock_in and salon_public_stylist_clock_out.

ALTER TABLE public.salon_time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage time entries - all" ON public.salon_time_entries;
DROP POLICY IF EXISTS "Owners read time entries" ON public.salon_time_entries;
CREATE POLICY "Owners read time entries"
  ON public.salon_time_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_time_entries.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon time entry inserts require trusted server-side validation" ON public.salon_time_entries;
CREATE POLICY "Salon time entry inserts require trusted server-side validation"
  ON public.salon_time_entries
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon time entry updates require trusted server-side validation" ON public.salon_time_entries;
CREATE POLICY "Salon time entry updates require trusted server-side validation"
  ON public.salon_time_entries
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon time entry deletes require trusted server-side validation" ON public.salon_time_entries;
CREATE POLICY "Salon time entry deletes require trusted server-side validation"
  ON public.salon_time_entries
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_time_entries FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_time_entries TO authenticated;
GRANT ALL ON TABLE public.salon_time_entries TO service_role;
