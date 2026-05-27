-- Salon Stylist Stripe Connect + Payout Method Tracking
--
-- Path A from the "stylist payouts" feature spec: each stylist onboards their
-- own Stripe Connect Express account through the platform so we can record
-- "who got paid via what". This migration does NOT change how deposit money
-- flows (still lands on the owner's Connect Express balance via destination
-- charges) — the owner still pays the stylist out-of-band (their own Stripe
-- dashboard → stylist's bank, Zelle, Venmo, etc.). The app's job is to track
-- the payout method and surface earnings + payout history to the stylist via
-- the existing /stylist/:stylistId unguessable-UUID page.
--
-- Touches:
--   1) salon_stylists                — Stripe Connect account + status fields
--   2) salon_commission_payouts      — method / reference / stripe_transfer_id
--   3) salon_public_get_stylist_connect_status — banner state for stylist page
--   4) salon_public_get_stylist_earnings       — earnings rollup for date range
--   5) salon_public_get_stylist_payouts        — recent payout history

------------------------------------------------------------------------------
-- 1. Stripe Connect columns on salon_stylists
------------------------------------------------------------------------------

ALTER TABLE public.salon_stylists
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id        TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status            TEXT NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_payouts_enabled   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_details_submitted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_updated_at        TIMESTAMPTZ;

-- Stripe account ids are <= 64 chars in practice — cap to keep malformed
-- ids out of logs / indexes.
ALTER TABLE public.salon_stylists
  DROP CONSTRAINT IF EXISTS salon_stylists_stripe_account_len;
ALTER TABLE public.salon_stylists
  ADD CONSTRAINT salon_stylists_stripe_account_len
  CHECK (stripe_connect_account_id IS NULL OR char_length(stripe_connect_account_id) <= 64);

ALTER TABLE public.salon_stylists
  DROP CONSTRAINT IF EXISTS salon_stylists_stripe_connect_status_chk;
ALTER TABLE public.salon_stylists
  ADD CONSTRAINT salon_stylists_stripe_connect_status_chk
  CHECK (stripe_connect_status IN ('not_connected','pending','active','restricted'));

-- Webhook lookups by Stripe account id are the hot path. Partial unique so
-- the 99% of stylist rows that never connect Stripe don't all collide on NULL.
CREATE UNIQUE INDEX IF NOT EXISTS salon_stylists_stripe_account_uidx
  ON public.salon_stylists (stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;

------------------------------------------------------------------------------
-- 2. Payout method tracking on salon_commission_payouts
--
--    Today the "Mark paid" log just records that money changed hands. Adding
--    a method enum + free-text reference lets owners record HOW (Zelle phone,
--    Venmo handle, check number) and lets the stylist portal show that back.
--    stripe_transfer_id is forward-looking — if/when we ever flip to Path B
--    (platform-charges + automated Stripe transfers), the field is already
--    there. Today it's only ever populated manually.
------------------------------------------------------------------------------

ALTER TABLE public.salon_commission_payouts
  ADD COLUMN IF NOT EXISTS method             TEXT NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS reference          TEXT,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT;

ALTER TABLE public.salon_commission_payouts
  DROP CONSTRAINT IF EXISTS salon_commission_payouts_method_chk;
ALTER TABLE public.salon_commission_payouts
  ADD CONSTRAINT salon_commission_payouts_method_chk
  CHECK (method IN ('cash','venmo','zelle','check','ach','stripe','other'));

ALTER TABLE public.salon_commission_payouts
  DROP CONSTRAINT IF EXISTS salon_commission_payouts_reference_len;
ALTER TABLE public.salon_commission_payouts
  ADD CONSTRAINT salon_commission_payouts_reference_len
  CHECK (reference IS NULL OR char_length(reference) <= 200);

ALTER TABLE public.salon_commission_payouts
  DROP CONSTRAINT IF EXISTS salon_commission_payouts_stripe_transfer_len;
ALTER TABLE public.salon_commission_payouts
  ADD CONSTRAINT salon_commission_payouts_stripe_transfer_len
  CHECK (stripe_transfer_id IS NULL OR char_length(stripe_transfer_id) <= 64);

------------------------------------------------------------------------------
-- 3. Public RPC — connect status for the /stylist/:id banner.
--
--    SECURITY DEFINER so anon can read just the four flags without granting
--    SELECT on salon_stylists. Gated by active stylist + active store, same
--    as salon_public_stylist_meta.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_get_stylist_connect_status(UUID);

CREATE OR REPLACE FUNCTION public.salon_public_get_stylist_connect_status(p_stylist_id UUID)
RETURNS TABLE (
  status TEXT,
  charges_enabled BOOLEAN,
  payouts_enabled BOOLEAN,
  details_submitted BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    st.stripe_connect_status,
    st.stripe_connect_charges_enabled,
    st.stripe_connect_payouts_enabled,
    st.stripe_connect_details_submitted
  FROM public.salon_stylists st
  JOIN public.store_profiles sp ON sp.id = st.store_id
  WHERE st.id = p_stylist_id
    AND st.is_active = true
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_stylist_connect_status(UUID) TO anon, authenticated;

------------------------------------------------------------------------------
-- 4. Public RPC — stylist earnings rollup over a date range.
--
--    Mirrors the per-stylist totals SalonCommissionsSection computes for the
--    owner. Commission base = service price + addons, matching the owner-side
--    rollup. Returns BIGINT for sums so a busy stylist over a wide window
--    can't overflow INTEGER.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_get_stylist_earnings(UUID, DATE, DATE);

CREATE OR REPLACE FUNCTION public.salon_public_get_stylist_earnings(
  p_stylist_id UUID,
  p_from DATE,
  p_to DATE
)
RETURNS TABLE (
  display_name TEXT,
  store_name TEXT,
  store_slug TEXT,
  commission_percent NUMERIC,
  service_count INTEGER,
  service_revenue_cents BIGINT,
  tips_cents BIGINT,
  commission_earned_cents BIGINT,
  total_paid_out_cents BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stylist AS (
    SELECT
      st.id,
      st.display_name,
      st.commission_percent,
      sp.name AS store_name,
      sp.slug AS store_slug
    FROM public.salon_stylists st
    JOIN public.store_profiles sp ON sp.id = st.store_id
    WHERE st.id = p_stylist_id
      AND st.is_active = true
      AND sp.is_active = true
  ),
  bookings_agg AS (
    SELECT
      COUNT(*)::INTEGER AS service_count,
      COALESCE(SUM(b.price_cents + COALESCE(b.addons_total_cents, 0)), 0)::BIGINT
        AS service_revenue_cents,
      COALESCE(SUM(b.tip_cents), 0)::BIGINT AS tips_cents
    FROM public.salon_bookings b
    WHERE b.stylist_id = p_stylist_id
      AND b.status = 'completed'
      AND b.start_at >= (p_from::TIMESTAMP AT TIME ZONE 'UTC')
      AND b.start_at <  ((p_to + 1)::TIMESTAMP AT TIME ZONE 'UTC')
  ),
  payouts_agg AS (
    SELECT COALESCE(SUM(total_paid_cents), 0)::BIGINT AS total_paid_out_cents
    FROM public.salon_commission_payouts
    WHERE stylist_id = p_stylist_id
      AND paid_at >= (p_from::TIMESTAMP AT TIME ZONE 'UTC')
      AND paid_at <  ((p_to + 1)::TIMESTAMP AT TIME ZONE 'UTC')
  )
  SELECT
    s.display_name,
    s.store_name,
    s.store_slug,
    s.commission_percent,
    b.service_count,
    b.service_revenue_cents,
    b.tips_cents,
    ROUND(b.service_revenue_cents * (s.commission_percent / 100))::BIGINT
      AS commission_earned_cents,
    p.total_paid_out_cents
  FROM stylist s
  CROSS JOIN bookings_agg b
  CROSS JOIN payouts_agg p;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_stylist_earnings(UUID, DATE, DATE) TO anon, authenticated;

------------------------------------------------------------------------------
-- 5. Public RPC — recent payouts for a stylist.
--
--    Same trust model as the stylist day page: the UUID in the URL is the
--    unguessable token. Capped at 100 rows so a long-tenured stylist can't
--    blow up the page.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_get_stylist_payouts(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.salon_public_get_stylist_payouts(
  p_stylist_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  period_from DATE,
  period_to DATE,
  services_count INTEGER,
  service_revenue_cents INTEGER,
  tips_cents INTEGER,
  commission_cents INTEGER,
  total_paid_cents INTEGER,
  method TEXT,
  reference TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.period_from,
    p.period_to,
    p.services_count,
    p.service_revenue_cents,
    p.tips_cents,
    p.commission_cents,
    p.total_paid_cents,
    p.method,
    p.reference,
    p.notes,
    p.paid_at
  FROM public.salon_commission_payouts p
  JOIN public.salon_stylists st ON st.id = p.stylist_id
  JOIN public.store_profiles sp ON sp.id = st.store_id
  WHERE p.stylist_id = p_stylist_id
    AND st.is_active = true
    AND sp.is_active = true
  ORDER BY p.paid_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_stylist_payouts(UUID, INTEGER) TO anon, authenticated;
