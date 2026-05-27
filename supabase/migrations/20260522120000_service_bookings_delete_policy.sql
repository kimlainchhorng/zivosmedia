-- Allow store owners (and admins) to DELETE their own service bookings.
-- Previously only INSERT/SELECT/UPDATE policies existed on public.service_bookings,
-- so authenticated DELETE requests silently returned 204 without removing rows.

DROP POLICY IF EXISTS "Store owners can delete their bookings" ON public.service_bookings;

CREATE POLICY "Store owners can delete their bookings"
  ON public.service_bookings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = store_id AND s.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin')
  );
