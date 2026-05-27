-- Per-client color formula library.
--
-- Today stylists scrawl color formulas into salon_bookings.internal_notes —
-- a free-text field that's hard to pull up "what did I use for Jamie last
-- time?" without scrolling through her booking history. This migration
-- promotes formulas into a first-class table keyed by client, with optional
-- links to the booking + service that the formula was applied at.
--
-- Two anon-callable RPCs let the stylist drive the library from the
-- existing /stylist/:id page (same UUID-as-token trust model as the
-- self-service migration):
--   * salon_public_stylist_get_formulas_for_booking — list past formulas
--     for the client of a given booking.
--   * salon_public_stylist_save_formula — append a formula tied to a booking.

------------------------------------------------------------------------------
-- 1. salon_color_formulas table
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_color_formulas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.salon_clients(id) ON DELETE CASCADE,
  stylist_id UUID REFERENCES public.salon_stylists(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.salon_bookings(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.salon_services(id) ON DELETE SET NULL,

  -- The recipe itself. 1..1000 chars matches the internal_notes ceiling so
  -- a stylist migrating a long note doesn't get clipped.
  formula TEXT NOT NULL CHECK (char_length(formula) BETWEEN 1 AND 1000),

  -- Extra context the stylist wants to remember next time: "loved it",
  -- "client said too dark; try 7G next visit", etc.
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),

  -- When the formula was actually applied. Separate from created_at so a
  -- stylist can backfill formulas (created today, applied last Tuesday).
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_color_formulas_client_idx
  ON public.salon_color_formulas (client_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS salon_color_formulas_store_idx
  ON public.salon_color_formulas (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS salon_color_formulas_stylist_idx
  ON public.salon_color_formulas (stylist_id, applied_at DESC)
  WHERE stylist_id IS NOT NULL;

DROP TRIGGER IF EXISTS salon_color_formulas_set_updated_at ON public.salon_color_formulas;
CREATE TRIGGER salon_color_formulas_set_updated_at
  BEFORE UPDATE ON public.salon_color_formulas
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_color_formulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage color formulas - all"
  ON public.salon_color_formulas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_color_formulas.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_color_formulas.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- Authenticated stylists (with salon_stylists.user_id linked) get full read
-- + write on rows where stylist_id matches their own — mirrors the
-- salon_time_entries "Stylists can manage their own" policy.
CREATE POLICY "Stylists can manage their own formulas"
  ON public.salon_color_formulas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_stylists st
      WHERE st.id = salon_color_formulas.stylist_id
        AND st.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salon_stylists st
      WHERE st.id = salon_color_formulas.stylist_id
        AND st.user_id = (SELECT auth.uid())
    )
  );

-- Clients linked through salon_clients.user_id can read their own formula
-- history (read-only). Lets the customer-portal /salon/me view eventually
-- show "your color history" without an owner roundtrip.
CREATE POLICY "Clients can read their own formulas"
  ON public.salon_color_formulas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_clients sc
      WHERE sc.id = salon_color_formulas.client_id
        AND sc.user_id = (SELECT auth.uid())
    )
  );

------------------------------------------------------------------------------
-- 2. Public RPC: list past formulas for the client of a given booking.
--
--    The booking_id is the entry point (it's what the stylist's day page
--    has in hand), and the RPC derives the client_id from it. The function
--    enforces booking.stylist_id = p_stylist_id so a random URL holder
--    can't enumerate other stylists' bookings.
--
--    Capped at 50 rows defensively — a long-tenured client might have
--    dozens of formulas, but rendering more than the most recent ones is
--    UX overkill.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_stylist_get_formulas_for_booking(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.salon_public_stylist_get_formulas_for_booking(
  p_booking_id UUID,
  p_stylist_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  formula TEXT,
  notes TEXT,
  applied_at TIMESTAMPTZ,
  service_name TEXT,
  stylist_name TEXT,
  booking_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id UUID;
  v_store_id UUID;
BEGIN
  SELECT b.client_id, b.store_id
    INTO v_client_id, v_store_id
    FROM public.salon_bookings b
    WHERE b.id = p_booking_id
      AND b.stylist_id = p_stylist_id;
  IF v_client_id IS NULL THEN
    -- No booking, mismatched stylist, OR booking without a linked client
    -- (walk-ins). Either way, no formulas to return.
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      f.id, f.formula, f.notes, f.applied_at,
      s.name AS service_name,
      st.display_name AS stylist_name,
      f.booking_id
    FROM public.salon_color_formulas f
    LEFT JOIN public.salon_services s ON s.id = f.service_id
    LEFT JOIN public.salon_stylists st ON st.id = f.stylist_id
    WHERE f.client_id = v_client_id
      AND f.store_id = v_store_id
    ORDER BY f.applied_at DESC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 50));
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_get_formulas_for_booking(UUID, UUID, INTEGER)
  TO anon, authenticated;

------------------------------------------------------------------------------
-- 3. Public RPC: append a new formula to the library, tied to a booking.
--
--    Derives client_id + service_id from the booking. Sets stylist_id from
--    the gate parameter (which the booking-row check above guarantees is
--    the assigned stylist). applied_at defaults to now() — backfill is an
--    owner-side action via the admin UI.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_stylist_save_formula(UUID, UUID, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.salon_public_stylist_save_formula(
  p_booking_id UUID,
  p_stylist_id UUID,
  p_formula TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  formula TEXT,
  notes TEXT,
  applied_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.salon_bookings;
  v_clean_formula TEXT;
  v_clean_notes TEXT;
  v_id UUID;
  v_applied_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_row
    FROM public.salon_bookings
    WHERE salon_bookings.id = p_booking_id;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.stylist_id IS NULL OR v_row.stylist_id <> p_stylist_id THEN
    RAISE EXCEPTION 'this booking is not assigned to that stylist' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.client_id IS NULL THEN
    -- Walk-in / public booking with no linked client — formulas need a
    -- client to attach to. Surface so the UI can render "saved as note
    -- instead" if it wants to fall back.
    RAISE EXCEPTION 'this booking has no linked client' USING ERRCODE = 'P0001';
  END IF;

  v_clean_formula := NULLIF(btrim(COALESCE(p_formula, '')), '');
  IF v_clean_formula IS NULL THEN
    RAISE EXCEPTION 'formula is required' USING ERRCODE = 'P0001';
  END IF;
  IF char_length(v_clean_formula) > 1000 THEN
    v_clean_formula := left(v_clean_formula, 1000);
  END IF;

  v_clean_notes := NULLIF(btrim(COALESCE(p_notes, '')), '');
  IF v_clean_notes IS NOT NULL AND char_length(v_clean_notes) > 500 THEN
    v_clean_notes := left(v_clean_notes, 500);
  END IF;

  INSERT INTO public.salon_color_formulas (
    store_id, client_id, stylist_id, booking_id, service_id,
    formula, notes
  )
  VALUES (
    v_row.store_id, v_row.client_id, v_row.stylist_id, v_row.id, v_row.service_id,
    v_clean_formula, v_clean_notes
  )
  RETURNING salon_color_formulas.id, salon_color_formulas.applied_at
  INTO v_id, v_applied_at;

  RETURN QUERY SELECT v_id, v_clean_formula, v_clean_notes, v_applied_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_save_formula(UUID, UUID, TEXT, TEXT)
  TO anon, authenticated;
