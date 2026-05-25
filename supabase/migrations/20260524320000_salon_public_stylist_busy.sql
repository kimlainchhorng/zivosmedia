-- Public booking page needs to know which time ranges a stylist already has
-- pending/confirmed bookings on, so the customer's availability grid hides
-- taken slots. The salon_bookings table doesn't have an anon SELECT policy
-- (we never want client_name / client_phone exposed) and shouldn't grow one
-- because RLS only filters rows, not columns.
--
-- This SECURITY DEFINER RPC returns just start_at/end_at — no client info —
-- for the requested stylist within the requested day window.

CREATE OR REPLACE FUNCTION public.salon_public_stylist_busy(
  p_stylist_id UUID,
  p_day_start TIMESTAMPTZ,
  p_day_end TIMESTAMPTZ
)
RETURNS TABLE (start_at TIMESTAMPTZ, end_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.start_at, b.end_at
  FROM public.salon_bookings b
  JOIN public.salon_stylists st ON st.id = b.stylist_id
  WHERE b.stylist_id = p_stylist_id
    AND b.status IN ('pending', 'confirmed')
    AND st.is_active = true
    AND b.start_at < p_day_end
    AND b.end_at > p_day_start;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_busy(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- Array variant for the "Any stylist" mode — returns busy ranges for many
-- stylists in one round trip. Same restriction set as the single-stylist
-- version above.
CREATE OR REPLACE FUNCTION public.salon_public_stylists_busy(
  p_stylist_ids UUID[],
  p_day_start TIMESTAMPTZ,
  p_day_end TIMESTAMPTZ
)
RETURNS TABLE (stylist_id UUID, start_at TIMESTAMPTZ, end_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.stylist_id, b.start_at, b.end_at
  FROM public.salon_bookings b
  JOIN public.salon_stylists st ON st.id = b.stylist_id
  WHERE b.stylist_id = ANY (p_stylist_ids)
    AND b.status IN ('pending', 'confirmed')
    AND st.is_active = true
    AND b.start_at < p_day_end
    AND b.end_at > p_day_start;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylists_busy(UUID[], TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- And blockouts — same shape. salon_blockouts has no anon SELECT policy, so
-- direct queries return zero rows under RLS. Expose only (stylist_id, start, end).
CREATE OR REPLACE FUNCTION public.salon_public_stylists_blockouts(
  p_stylist_ids UUID[],
  p_day_start TIMESTAMPTZ,
  p_day_end TIMESTAMPTZ
)
RETURNS TABLE (stylist_id UUID, start_at TIMESTAMPTZ, end_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.stylist_id, b.start_at, b.end_at
  FROM public.salon_blockouts b
  JOIN public.salon_stylists st ON st.id = b.stylist_id
  WHERE b.stylist_id = ANY (p_stylist_ids)
    AND st.is_active = true
    AND b.start_at < p_day_end
    AND b.end_at > p_day_start;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylists_blockouts(UUID[], TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
