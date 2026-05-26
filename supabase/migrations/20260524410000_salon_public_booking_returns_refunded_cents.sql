-- Extend the public booking-detail RPC so the customer-facing detail page can
-- accurately display whether a paid deposit was (partially) refunded by the
-- owner via the Stripe dashboard.
--
-- The cancellation flow uses this column to compute the "you'll forfeit $X"
-- warning on the cancel-confirmation dialog. Without it, an owner who's
-- already issued a partial refund would still see the full deposit amount
-- in the warning copy — confusing at best, chargeback-bait at worst.

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
  cancellation_window_hours INTEGER,
  deposit_cents INTEGER,
  deposit_paid_cents INTEGER,
  deposit_refunded_cents INTEGER
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
    COALESCE(ps.cancellation_window_hours, 0) AS cancellation_window_hours,
    COALESCE(b.deposit_cents, 0) AS deposit_cents,
    COALESCE(b.deposit_paid_cents, 0) AS deposit_paid_cents,
    COALESCE(b.deposit_refunded_cents, 0) AS deposit_refunded_cents
  FROM public.salon_bookings b
  JOIN public.store_profiles sp ON sp.id = b.store_id
  LEFT JOIN public.store_payment_settings ps
    ON ps.store_id = b.store_id AND ps.market = 'us'
  WHERE b.id = p_id
    AND b.source = 'app'
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_booking(UUID) TO anon, authenticated;
