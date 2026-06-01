-- Gate salon waitlist mutations through salon-waitlist-manage.
-- Owners/admins keep read access for the dashboard and realtime badges.

ALTER TABLE public.salon_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage waitlist - all" ON public.salon_waitlist;

DROP POLICY IF EXISTS "Owners read waitlist" ON public.salon_waitlist;
CREATE POLICY "Owners read waitlist"
  ON public.salon_waitlist
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_waitlist.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon waitlist inserts require trusted server-side validation" ON public.salon_waitlist;
CREATE POLICY "Salon waitlist inserts require trusted server-side validation"
  ON public.salon_waitlist
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon waitlist updates require trusted server-side validation" ON public.salon_waitlist;
CREATE POLICY "Salon waitlist updates require trusted server-side validation"
  ON public.salon_waitlist
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon waitlist deletes require trusted server-side validation" ON public.salon_waitlist;
CREATE POLICY "Salon waitlist deletes require trusted server-side validation"
  ON public.salon_waitlist
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_waitlist FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_waitlist TO authenticated;
GRANT ALL ON TABLE public.salon_waitlist TO service_role;
