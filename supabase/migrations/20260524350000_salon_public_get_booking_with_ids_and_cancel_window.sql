-- Extend salon_public_get_booking's return shape with three fields the
-- public booking detail page already references:
--   - service_id, stylist_id — used by the "Book again" deep-link query
--     (?service=&stylist=) so the customer lands on the right pre-selection.
--   - cancellation_window_hours — drives the "Free cancellation until …"
--     deadline display. Lives on store_payment_settings (USA market).
--
-- Without these, the TS interface silently has undefined values: "Book again"
-- always linked to the bare /salon/<slug>, and the free-cancel deadline never
-- showed even when configured.
--
-- Postgres can't change a function's return type via CREATE OR REPLACE — drop
-- and recreate. GRANT re-issued below.

DROP FUNCTION IF EXISTS public.salon_public_get_booking(UUID);

CREATE OR REPLACE FUNCTION public.salon_public_get_booking(p_id UUID)
RETURNS TABLE (
  id UUID,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  service_id UUID,
  service_name TEXT,
  stylist_id UUID,
  stylist_name TEXT,
  client_name TEXT,
  client_phone TEXT,
  client_email TEXT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  price_cents INTEGER,
  addons_total_cents INTEGER,
  duration_minutes INTEGER,
  status TEXT,
  source TEXT,
  cancelled_at TIMESTAMPTZ,
  cancellation_window_hours INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.store_id, sp.name AS store_name, sp.slug AS store_slug,
    b.service_id, b.service_name,
    b.stylist_id, b.stylist_name,
    b.client_name, b.client_phone, b.client_email,
    b.start_at, b.end_at,
    b.price_cents,
    COALESCE(b.addons_total_cents, 0) AS addons_total_cents,
    b.duration_minutes,
    b.status::text, b.source,
    b.cancelled_at,
    -- USA-market settings carry the cancellation window. LEFT JOIN so older
    -- stores without a row fall back to NULL (the UI applies its own ?? 0).
    COALESCE(ps.cancellation_window_hours, 0) AS cancellation_window_hours
  FROM public.salon_bookings b
  JOIN public.store_profiles sp ON sp.id = b.store_id
  LEFT JOIN public.store_payment_settings ps
    ON ps.store_id = b.store_id AND ps.market = 'us'
  WHERE b.id = p_id
    AND b.source = 'app'        -- only bookings created through the public site
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_booking(UUID) TO anon, authenticated;
