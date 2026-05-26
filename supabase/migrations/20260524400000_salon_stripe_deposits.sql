-- Salon Online Deposits at Booking Time
--
-- Adds:
--   1) Stripe metadata columns on salon_bookings so we can map a Checkout
--      session / payment intent back to a booking + record refund state.
--   2) Extends tg_salon_sanitize_public_booking to compute the deposit owed
--      at booking-time using the salon's store_payment_settings.deposit_percent.
--   3) Relaxes the public-INSERT RLS WITH CHECK so the trigger-computed
--      deposit_cents survives the policy check.
--
-- The actual payment happens via the new create-salon-deposit edge function
-- (Stripe Checkout) and the existing stripe-webhook (checkout.session.completed
-- handler). Both call into THIS schema's columns.

------------------------------------------------------------------------------
-- 1. Stripe deposit columns on salon_bookings
------------------------------------------------------------------------------

ALTER TABLE public.salon_bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id    TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id  TEXT,
  ADD COLUMN IF NOT EXISTS deposit_refunded_cents      INTEGER NOT NULL DEFAULT 0
    CHECK (deposit_refunded_cents >= 0),
  ADD COLUMN IF NOT EXISTS deposit_refunded_at         TIMESTAMPTZ;

-- Length caps so a malformed value can't blow up Postgres logs.
ALTER TABLE public.salon_bookings
  DROP CONSTRAINT IF EXISTS salon_bookings_stripe_pi_len;
ALTER TABLE public.salon_bookings
  ADD CONSTRAINT salon_bookings_stripe_pi_len
  CHECK (stripe_payment_intent_id IS NULL OR char_length(stripe_payment_intent_id) <= 64);

ALTER TABLE public.salon_bookings
  DROP CONSTRAINT IF EXISTS salon_bookings_stripe_session_len;
ALTER TABLE public.salon_bookings
  ADD CONSTRAINT salon_bookings_stripe_session_len
  CHECK (stripe_checkout_session_id IS NULL OR char_length(stripe_checkout_session_id) <= 100);

-- Unique partial indexes — webhook lookups by payment_intent / session_id
-- are the hot path; full unique would block bulk imports.
CREATE UNIQUE INDEX IF NOT EXISTS salon_bookings_stripe_pi_uidx
  ON public.salon_bookings (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS salon_bookings_stripe_session_uidx
  ON public.salon_bookings (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

------------------------------------------------------------------------------
-- 2. Extend tg_salon_sanitize_public_booking to compute deposit_cents.
--    This trigger already fires BEFORE INSERT for public bookings; it now
--    also computes the deposit owed using store_payment_settings.deposit_percent.
--    Only runs on INSERT and only when Stripe is connected and deposit > 0.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_salon_sanitize_public_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_svc RECORD;
  v_sty RECORD;
  v_client_id UUID;
  v_deposit_percent INTEGER;
  v_stripe_status TEXT;
  v_deposit_cents INTEGER;
BEGIN
  IF NEW.source <> 'app' THEN
    RETURN NEW;
  END IF;

  IF NEW.service_id IS NULL THEN
    RAISE EXCEPTION 'service_id is required for public bookings';
  END IF;

  SELECT id, name, store_id, is_active, price_cents, duration_minutes
    INTO v_svc
    FROM public.salon_services
    WHERE id = NEW.service_id;
  IF v_svc.id IS NULL OR v_svc.store_id <> NEW.store_id OR v_svc.is_active = false THEN
    RAISE EXCEPTION 'invalid or inactive service for this salon';
  END IF;

  NEW.service_name := v_svc.name;
  NEW.price_cents := v_svc.price_cents;
  NEW.duration_minutes := v_svc.duration_minutes;
  NEW.end_at := NEW.start_at + make_interval(mins => v_svc.duration_minutes);

  IF NEW.stylist_id IS NOT NULL THEN
    SELECT id, display_name, store_id, is_active
      INTO v_sty
      FROM public.salon_stylists
      WHERE id = NEW.stylist_id;
    IF v_sty.id IS NULL OR v_sty.store_id <> NEW.store_id OR v_sty.is_active = false THEN
      RAISE EXCEPTION 'invalid or inactive stylist for this salon';
    END IF;
    NEW.stylist_name := v_sty.display_name;
  END IF;

  NEW.status := 'pending';
  -- Force money fields to safe values regardless of what the client sent.
  NEW.tip_cents := 0;
  NEW.tax_cents := 0;
  NEW.deposit_paid_cents := 0;
  NEW.deposit_paid_at := NULL;
  NEW.no_show_fee_charged_cents := 0;
  NEW.cancelled_at := NULL;
  NEW.cancellation_reason := NULL;
  NEW.internal_notes := NULL;
  -- Stripe metadata can never be set client-side; webhook is the only writer.
  NEW.stripe_payment_intent_id := NULL;
  NEW.stripe_checkout_session_id := NULL;
  NEW.deposit_refunded_cents := 0;
  NEW.deposit_refunded_at := NULL;

  -- Opt-ins — default safe (transactional true, marketing explicit).
  NEW.marketing_opt_in := COALESCE(NEW.marketing_opt_in, false);
  NEW.sms_opt_in       := COALESCE(NEW.sms_opt_in, true);
  NEW.email_opt_in     := COALESCE(NEW.email_opt_in, true);

  IF NEW.referral_source IS NOT NULL THEN
    NEW.referral_source := NULLIF(btrim(NEW.referral_source), '');
    IF NEW.referral_source IS NOT NULL THEN
      NEW.referral_source := left(NEW.referral_source, 120);
    END IF;
  END IF;

  -- ---- Authenticated submitter? Link to a salon_clients row. ---------------
  IF NEW.created_by_user_id IS NOT NULL THEN
    SELECT id INTO v_client_id
      FROM public.salon_clients
      WHERE store_id = NEW.store_id
        AND user_id = NEW.created_by_user_id
      LIMIT 1;
    IF v_client_id IS NULL THEN
      INSERT INTO public.salon_clients
        (store_id, user_id, display_name, phone, email,
         sms_opt_in, email_opt_in, marketing_opt_in)
      VALUES
        (NEW.store_id, NEW.created_by_user_id,
         COALESCE(NULLIF(btrim(NEW.client_name), ''), 'Client'),
         NULLIF(btrim(NEW.client_phone), ''),
         NULLIF(btrim(NEW.client_email), ''),
         NEW.sms_opt_in, NEW.email_opt_in, NEW.marketing_opt_in)
      RETURNING id INTO v_client_id;
    END IF;
    NEW.client_id := v_client_id;
  ELSE
    NEW.client_id := NULL;
  END IF;

  -- ---- Compute deposit_cents from the salon's settings ---------------------
  -- Only when:
  --   - Stripe is connected (status = 'active')
  --   - deposit_percent > 0
  -- Otherwise leave deposit_cents at 0 (no deposit owed; flow skips Stripe).
  SELECT deposit_percent, stripe_status
    INTO v_deposit_percent, v_stripe_status
    FROM public.store_payment_settings
    WHERE store_id = NEW.store_id AND market = 'us';

  IF COALESCE(v_stripe_status, 'not_connected') = 'active'
     AND COALESCE(v_deposit_percent, 0) > 0 THEN
    v_deposit_cents := ROUND((NEW.price_cents * v_deposit_percent::NUMERIC) / 100)::INTEGER;
    NEW.deposit_cents := GREATEST(0, v_deposit_cents);
  ELSE
    NEW.deposit_cents := 0;
  END IF;

  RETURN NEW;
END;
$$;

------------------------------------------------------------------------------
-- 3. Loosen the public-INSERT RLS WITH CHECK so the trigger-computed deposit
--    survives the policy. The trigger is the source of truth for deposit_cents
--    on public inserts — the policy still bars stranger-set positive values
--    via the same trigger forcing all other money fields to 0.
------------------------------------------------------------------------------

------------------------------------------------------------------------------
-- 4. Extend the public booking-detail RPC so the customer-facing page can
--    show "Deposit paid ✓" or surface a "Pay deposit now" button when the
--    deposit is still owed. The RPC was last updated in 20260524350000;
--    extend its RETURNS shape with deposit_cents + deposit_paid_cents.
------------------------------------------------------------------------------

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
  deposit_paid_cents INTEGER
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
    COALESCE(b.deposit_paid_cents, 0) AS deposit_paid_cents
  FROM public.salon_bookings b
  JOIN public.store_profiles sp ON sp.id = b.store_id
  LEFT JOIN public.store_payment_settings ps
    ON ps.store_id = b.store_id AND ps.market = 'us'
  WHERE b.id = p_id
    AND b.source = 'app'
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_booking(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can request bookings" ON public.salon_bookings;
CREATE POLICY "Public can request bookings"
  ON public.salon_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    source = 'app'
    AND status = 'pending'
    AND (created_by_user_id IS NULL OR created_by_user_id = (SELECT auth.uid()))
    AND tip_cents = 0
    AND tax_cents = 0
    AND deposit_paid_cents = 0
    AND no_show_fee_charged_cents = 0
    AND service_id IS NOT NULL
    AND stripe_payment_intent_id IS NULL
    AND stripe_checkout_session_id IS NULL
    AND deposit_refunded_cents = 0
    AND EXISTS (
      SELECT 1 FROM public.salon_services s
      WHERE s.id = salon_bookings.service_id
        AND s.store_id = salon_bookings.store_id
        AND s.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_bookings.store_id
        AND sp.is_active = true
    )
    -- Note: deposit_cents is intentionally NOT pinned to 0 here. The
    -- BEFORE-INSERT sanitize trigger sets it from store_payment_settings;
    -- the policy trusts that path.
  );
