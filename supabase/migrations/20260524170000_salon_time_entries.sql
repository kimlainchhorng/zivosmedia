-- Time clock for stylists. The Time Clock section inserts a row when a
-- stylist clocks in (end_at = null) and patches it on clock-out. A partial
-- unique index enforces "one open shift per stylist" at the DB level so
-- racing tabs/devices can't double-clock-in. Commissions/payroll can join
-- against this for paid hours.

CREATE TABLE IF NOT EXISTS public.salon_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  stylist_id UUID NOT NULL REFERENCES public.salon_stylists(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_at TIMESTAMPTZ,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  -- 'admin' = owner tapped the section; 'self' = stylist app; 'kiosk' = shared device.
  source TEXT NOT NULL DEFAULT 'admin'
    CHECK (source IN ('admin', 'self', 'kiosk')),
  CONSTRAINT salon_time_entries_time_range CHECK (end_at IS NULL OR end_at > start_at),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_time_entries_store_start_idx
  ON public.salon_time_entries (store_id, start_at DESC);
CREATE INDEX IF NOT EXISTS salon_time_entries_stylist_start_idx
  ON public.salon_time_entries (stylist_id, start_at DESC);

-- At most one open shift per stylist. The hook relies on 23505 here to
-- surface a friendly "Already clocked in." message.
CREATE UNIQUE INDEX IF NOT EXISTS salon_time_entries_one_open_uidx
  ON public.salon_time_entries (stylist_id)
  WHERE end_at IS NULL;

DROP TRIGGER IF EXISTS salon_time_entries_set_updated_at ON public.salon_time_entries;
CREATE TRIGGER salon_time_entries_set_updated_at
  BEFORE UPDATE ON public.salon_time_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage time entries - all"
  ON public.salon_time_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_time_entries.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_time_entries.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- A stylist linked through salon_stylists.user_id can clock themselves in/out
-- (the "self" source) without going through the owner account.
CREATE POLICY "Stylists can manage their own time entries"
  ON public.salon_time_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_stylists st
      WHERE st.id = salon_time_entries.stylist_id
        AND st.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salon_stylists st
      WHERE st.id = salon_time_entries.stylist_id
        AND st.user_id = (SELECT auth.uid())
    )
  );
