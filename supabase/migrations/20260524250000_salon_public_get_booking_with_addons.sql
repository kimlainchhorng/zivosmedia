-- salon_public_get_booking didn't return addons_total_cents, so a customer
-- whose booking later had add-ons attached saw the base service price only.
-- Replace the function to include addons_total_cents so the public detail
-- page can render the full service total.
--
-- Postgres won't let CREATE OR REPLACE change a function's return type —
-- drop and recreate. Existing GRANT survives the new CREATE because we
-- re-issue it below.

DROP FUNCTION IF EXISTS public.salon_public_get_booking(UUID);

CREATE OR REPLACE FUNCTION public.salon_public_get_booking(p_id UUID)
RETURNS TABLE (
  id UUID,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  service_name TEXT,
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
  cancelled_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id, b.store_id, sp.name AS store_name, sp.slug AS store_slug,
    b.service_name, b.stylist_name,
    b.client_name, b.client_phone, b.client_email,
    b.start_at, b.end_at,
    b.price_cents,
    COALESCE(b.addons_total_cents, 0) AS addons_total_cents,
    b.duration_minutes,
    b.status::text, b.source,
    b.cancelled_at
  FROM public.salon_bookings b
  JOIN public.store_profiles sp ON sp.id = b.store_id
  WHERE b.id = p_id
    AND b.source = 'app'        -- only bookings created through the public site
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_booking(UUID) TO anon, authenticated;
