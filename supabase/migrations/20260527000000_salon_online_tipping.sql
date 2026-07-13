-- Salon Online Tipping (post-service)
--
-- Customer paid a deposit at booking time → we saved a PaymentMethod off-session
-- (see 20260524420000_salon_no_show_fees.sql, which added
-- stripe_customer_id / stripe_payment_method_id / card_brand / card_last_four).
-- After the service is completed, the customer can return to the booking
-- detail page and tap "Leave a tip" — we charge the saved card off-session,
-- the resulting transfer lands on the salon owner's Stripe Connect Express
-- account (same destination as the deposit), and we stamp tip_cents +
-- payment-intent id on the booking.
--
-- Touches:
--   1) salon_bookings              — tip PI id, charged-at, failure surface
--   2) tg_salon_sanitize_public_booking — force-clear new fields on public INSERT
--   3) salon_public_get_booking    — extend return shape so the booking-detail
--                                   page can render tip state / card last 4
--   4) salon_public_get_tip_policy — new RPC the tipping UI calls to learn
--                                   the salon's tip presets + tips_enabled

------------------------------------------------------------------------------
-- 1. Tipping columns on salon_bookings
------------------------------------------------------------------------------

ALTER TABLE public.salon_bookings
  ADD COLUMN IF NOT EXISTS tip_stripe_payment_intent_id  TEXT,
  ADD COLUMN IF NOT EXISTS tip_charged_at                TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tip_charge_failed_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tip_charge_failed_reason      TEXT;

-- Length caps — Stripe ids and decline-reason strings can't be allowed to
-- blow up logs/indexes.
ALTER TABLE public.salon_bookings
  DROP CONSTRAINT IF EXISTS salon_bookings_tip_pi_len;
ALTER TABLE public.salon_bookings
  ADD CONSTRAINT salon_bookings_tip_pi_len
  CHECK (tip_stripe_payment_intent_id IS NULL OR char_length(tip_stripe_payment_intent_id) <= 64);

ALTER TABLE public.salon_bookings
  DROP CONSTRAINT IF EXISTS salon_bookings_tip_fail_reason_len;
ALTER TABLE public.salon_bookings
  ADD CONSTRAINT salon_bookings_tip_fail_reason_len
  CHECK (tip_charge_failed_reason IS NULL OR char_length(tip_charge_failed_reason) <= 300);

-- Webhook lookup index for payment_intent.succeeded / failed events keyed on
-- the tip PI id.
CREATE UNIQUE INDEX IF NOT EXISTS salon_bookings_tip_pi_uidx
  ON public.salon_bookings (tip_stripe_payment_intent_id)
  WHERE tip_stripe_payment_intent_id IS NOT NULL;

------------------------------------------------------------------------------
-- 2. Force-clear new Stripe fields on public-INSERT.
--    Anon submitters must not be able to seed a fake tip_charged_at or PI id;
--    the sanitize trigger is the only path through which a public row is
--    accepted (see tg_salon_sanitize_public_booking).
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
  v_no_show_fee_cents INTEGER;
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
  NEW.stripe_customer_id := NULL;
  NEW.stripe_payment_method_id := NULL;
  NEW.card_brand := NULL;
  NEW.card_last_four := NULL;
  NEW.no_show_fee_payment_intent_id := NULL;
  NEW.no_show_fee_charge_failed_at := NULL;
  NEW.no_show_fee_charge_failed_reason := NULL;
  NEW.no_show_fee_refunded_cents := 0;
  NEW.no_show_fee_refunded_at := NULL;
  -- New tipping fields: webhook + edge function are the only writers.
  NEW.tip_stripe_payment_intent_id := NULL;
  NEW.tip_charged_at := NULL;
  NEW.tip_charge_failed_at := NULL;
  NEW.tip_charge_failed_reason := NULL;
  -- no_show_fee_consent_at is intentionally NOT cleared — it's the audit
  -- trail of when the customer accepted the policy. The PublicSalonBookingPage
  -- stamps it client-side when the consent disclosure is rendered.

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

  -- ---- Compute deposit_cents + snapshot no_show_fee_cents -----------------
  SELECT deposit_percent, no_show_fee_cents, stripe_status
    INTO v_deposit_percent, v_no_show_fee_cents, v_stripe_status
    FROM public.store_payment_settings
    WHERE store_id = NEW.store_id AND market = 'us';

  IF COALESCE(v_stripe_status, 'not_connected') = 'active'
     AND COALESCE(v_deposit_percent, 0) > 0 THEN
    v_deposit_cents := ROUND((NEW.price_cents * v_deposit_percent::NUMERIC) / 100)::INTEGER;
    NEW.deposit_cents := GREATEST(0, v_deposit_cents);
    NEW.no_show_fee_cents := GREATEST(0, COALESCE(v_no_show_fee_cents, 0));
  ELSE
    NEW.deposit_cents := 0;
    NEW.no_show_fee_cents := 0;
    NEW.no_show_fee_consent_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

------------------------------------------------------------------------------
-- 3. Extend salon_public_get_booking to surface tip state to the
--    customer-facing booking detail page.
--    Adds: tip_cents (already on the table, just exposing it), card_last_four
--    (so we can render "tipped via card ending 4242"), tip_charged_at, and
--    tip_charge_failed_reason so the page can show a "we couldn't charge
--    your card, please retry" hint after an off-session decline.
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
  deposit_paid_cents INTEGER,
  deposit_refunded_cents INTEGER,
  no_show_fee_cents INTEGER,
  tip_cents INTEGER,
  tip_charged_at TIMESTAMPTZ,
  tip_charge_failed_reason TEXT,
  card_brand TEXT,
  card_last_four TEXT
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
    COALESCE(b.deposit_refunded_cents, 0) AS deposit_refunded_cents,
    COALESCE(b.no_show_fee_cents, 0) AS no_show_fee_cents,
    COALESCE(b.tip_cents, 0) AS tip_cents,
    b.tip_charged_at,
    b.tip_charge_failed_reason,
    b.card_brand,
    b.card_last_four
  FROM public.salon_bookings b
  JOIN public.store_profiles sp ON sp.id = b.store_id
  LEFT JOIN public.store_payment_settings ps
    ON ps.store_id = b.store_id AND ps.market = 'us'
  WHERE b.id = p_id
    AND b.source = 'app'
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_booking(UUID) TO anon, authenticated;

------------------------------------------------------------------------------
-- 4. Public-readable tip policy RPC. The tipping UI needs presets +
--    tips_enabled + stripe_active so it can render "Leave a tip" with
--    the right preset chips and gracefully hide when tips are off.
--    store_payment_settings is owner-only via RLS, so this RPC exposes
--    just the customer-relevant fields.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_get_tip_policy(UUID);

CREATE OR REPLACE FUNCTION public.salon_public_get_tip_policy(p_store_id UUID)
RETURNS TABLE (
  tips_enabled BOOLEAN,
  tip_presets INTEGER[],
  tip_applies_pre_tax BOOLEAN,
  stripe_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(ps.tips_enabled, true) AS tips_enabled,
    COALESCE(ps.tip_presets, ARRAY[15, 18, 20]) AS tip_presets,
    COALESCE(ps.tip_applies_pre_tax, true) AS tip_applies_pre_tax,
    (COALESCE(ps.stripe_status, 'not_connected') = 'active') AS stripe_active
  FROM public.store_profiles sp
  LEFT JOIN public.store_payment_settings ps
    ON ps.store_id = sp.id AND ps.market = 'us'
  WHERE sp.id = p_store_id
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_tip_policy(UUID) TO anon, authenticated;
