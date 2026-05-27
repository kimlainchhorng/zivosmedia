-- Salon Automatic No-Show Fees
--
-- Builds on the online-deposits flow (20260524400000): when the customer
-- pays a deposit via Stripe Checkout, we now ALSO save the card off-session
-- (`setup_future_usage: 'off_session'` added in create-salon-deposit). The
-- webhook persists the resulting Customer + PaymentMethod onto the booking
-- row, and a new edge function (charge-salon-no-show-fee) lets the owner
-- charge the saved card when they flip the booking to no_show.
--
-- Policy (chosen by the operator):
--   * No-show fee is independent of the deposit — both are charged in full
--     when the customer no-shows. The deposit is NOT consumed first.
--   * Owner must confirm each charge — no auto-firing, no nightly cron.
--   * A no-show fee can only fire when a card is on file, which means the
--     booking had to have collected a deposit. Walk-in / phone bookings
--     have no saved card and can't be automatically charged.

------------------------------------------------------------------------------
-- 1. New columns on salon_bookings
------------------------------------------------------------------------------

ALTER TABLE public.salon_bookings
  -- Saved card (populated by the webhook after deposit Checkout completes).
  ADD COLUMN IF NOT EXISTS stripe_customer_id          TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id    TEXT,
  ADD COLUMN IF NOT EXISTS card_brand                  TEXT,
  ADD COLUMN IF NOT EXISTS card_last_four              TEXT,

  -- Snapshot of store_payment_settings.no_show_fee_cents at booking-insert
  -- time. Locks in the amount the customer consented to so a later policy
  -- change can't retroactively change what they get charged.
  ADD COLUMN IF NOT EXISTS no_show_fee_cents           INTEGER NOT NULL DEFAULT 0
    CHECK (no_show_fee_cents >= 0),

  -- Off-session PaymentIntent for the no-show charge (also unique partial
  -- index below — for webhook lookups + idempotency).
  ADD COLUMN IF NOT EXISTS no_show_fee_payment_intent_id TEXT,

  -- Charge failure surface (card declined, 3DS, etc.).
  ADD COLUMN IF NOT EXISTS no_show_fee_charge_failed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS no_show_fee_charge_failed_reason TEXT,

  -- Customer's consent timestamp for the no-show policy at booking time.
  -- Stamped client-side by PublicSalonBookingPage when the disclosure is
  -- rendered. Sanitize trigger preserves it (doesn't force-clear).
  ADD COLUMN IF NOT EXISTS no_show_fee_consent_at      TIMESTAMPTZ,

  -- Refund sync (manual owner refund from Stripe dashboard → webhook).
  ADD COLUMN IF NOT EXISTS no_show_fee_refunded_cents  INTEGER NOT NULL DEFAULT 0
    CHECK (no_show_fee_refunded_cents >= 0),
  ADD COLUMN IF NOT EXISTS no_show_fee_refunded_at     TIMESTAMPTZ;

-- Length caps so malformed Stripe ids can't blow up Postgres logs.
ALTER TABLE public.salon_bookings
  DROP CONSTRAINT IF EXISTS salon_bookings_stripe_customer_len;
ALTER TABLE public.salon_bookings
  ADD CONSTRAINT salon_bookings_stripe_customer_len
  CHECK (stripe_customer_id IS NULL OR char_length(stripe_customer_id) <= 64);

ALTER TABLE public.salon_bookings
  DROP CONSTRAINT IF EXISTS salon_bookings_stripe_payment_method_len;
ALTER TABLE public.salon_bookings
  ADD CONSTRAINT salon_bookings_stripe_payment_method_len
  CHECK (stripe_payment_method_id IS NULL OR char_length(stripe_payment_method_id) <= 64);

ALTER TABLE public.salon_bookings
  DROP CONSTRAINT IF EXISTS salon_bookings_no_show_pi_len;
ALTER TABLE public.salon_bookings
  ADD CONSTRAINT salon_bookings_no_show_pi_len
  CHECK (no_show_fee_payment_intent_id IS NULL OR char_length(no_show_fee_payment_intent_id) <= 64);

-- Card last_four must be exactly 4 digits (or null).
ALTER TABLE public.salon_bookings
  DROP CONSTRAINT IF EXISTS salon_bookings_card_last_four_shape;
ALTER TABLE public.salon_bookings
  ADD CONSTRAINT salon_bookings_card_last_four_shape
  CHECK (card_last_four IS NULL OR card_last_four ~ '^[0-9]{4}$');

-- Brand cap (visa / mastercard / amex / discover / etc.).
ALTER TABLE public.salon_bookings
  DROP CONSTRAINT IF EXISTS salon_bookings_card_brand_len;
ALTER TABLE public.salon_bookings
  ADD CONSTRAINT salon_bookings_card_brand_len
  CHECK (card_brand IS NULL OR char_length(card_brand) <= 30);

-- Unique partial index — webhook lookups by no_show PI id are the hot path.
CREATE UNIQUE INDEX IF NOT EXISTS salon_bookings_no_show_pi_uidx
  ON public.salon_bookings (no_show_fee_payment_intent_id)
  WHERE no_show_fee_payment_intent_id IS NOT NULL;

------------------------------------------------------------------------------
-- 2. Extend tg_salon_sanitize_public_booking to snapshot no_show_fee_cents.
--    Same shape as the deposit_cents snapshot: only set when a card will
--    actually be saved (i.e., when a deposit is being collected). Force-zero
--    all webhook-owned Stripe fields. Preserve the customer-supplied
--    no_show_fee_consent_at (it's the audit trail).
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
  -- Both require Stripe to be 'active'. The no-show fee additionally
  -- requires a deposit (deposit_percent > 0) — without a deposit there's
  -- no Checkout step to save a card on, so an unsaved card can't be charged
  -- later. Snapshotting a fee that can't fire would mislead the customer.
  SELECT deposit_percent, no_show_fee_cents, stripe_status
    INTO v_deposit_percent, v_no_show_fee_cents, v_stripe_status
    FROM public.store_payment_settings
    WHERE store_id = NEW.store_id AND market = 'us';

  IF COALESCE(v_stripe_status, 'not_connected') = 'active'
     AND COALESCE(v_deposit_percent, 0) > 0 THEN
    v_deposit_cents := ROUND((NEW.price_cents * v_deposit_percent::NUMERIC) / 100)::INTEGER;
    NEW.deposit_cents := GREATEST(0, v_deposit_cents);
    -- Card will be saved → snapshot the no-show fee at booking time.
    NEW.no_show_fee_cents := GREATEST(0, COALESCE(v_no_show_fee_cents, 0));
  ELSE
    NEW.deposit_cents := 0;
    -- No deposit → no saved card → no auto-chargeable fee.
    NEW.no_show_fee_cents := 0;
    -- Clear any stale consent_at the client may have stamped — without a
    -- fee, the consent is meaningless and would just confuse audits.
    NEW.no_show_fee_consent_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

------------------------------------------------------------------------------
-- 3. Loosen the public-INSERT RLS WITH CHECK so the trigger-computed fee
--    snapshot survives the policy. Same reasoning as for deposit_cents:
--    the sanitize trigger is the source of truth on public inserts; the
--    policy trusts it.
------------------------------------------------------------------------------

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
    -- New no-show Stripe fields: stranger may not pre-populate any of them.
    AND stripe_customer_id IS NULL
    AND stripe_payment_method_id IS NULL
    AND card_brand IS NULL
    AND card_last_four IS NULL
    AND no_show_fee_payment_intent_id IS NULL
    AND no_show_fee_charge_failed_at IS NULL
    AND no_show_fee_charge_failed_reason IS NULL
    AND no_show_fee_refunded_cents = 0
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
    -- Note: deposit_cents and no_show_fee_cents are intentionally NOT
    -- pinned to 0. The BEFORE-INSERT sanitize trigger sets them from
    -- store_payment_settings; the policy trusts that path. The customer-
    -- supplied no_show_fee_consent_at is also accepted as-is (audit trail).
  );

------------------------------------------------------------------------------
-- 4. Extend the public booking-detail RPC. The previous migration already
--    bumped the shape to include deposit_cents/paid/refunded; add the
--    no-show fee snapshot so the confirmation page can render
--    "your card may be charged $X if you no-show" copy.
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
  no_show_fee_cents INTEGER
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
    COALESCE(b.no_show_fee_cents, 0) AS no_show_fee_cents
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
-- 5. Public-readable payment policy RPC. The customer-facing booking page
--    needs to display the no-show fee + deposit-percent up front so we can
--    show the cancellation-policy disclosure BEFORE the customer submits.
--    store_payment_settings itself is owner-only via RLS; this RPC exposes
--    just the customer-relevant fields (no Stripe account ids, no tip
--    config, no internal fields).
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_get_payment_policy(UUID);

CREATE OR REPLACE FUNCTION public.salon_public_get_payment_policy(p_store_id UUID)
RETURNS TABLE (
  deposit_percent INTEGER,
  no_show_fee_cents INTEGER,
  cancellation_window_hours INTEGER,
  stripe_active BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(ps.deposit_percent, 0) AS deposit_percent,
    COALESCE(ps.no_show_fee_cents, 0) AS no_show_fee_cents,
    COALESCE(ps.cancellation_window_hours, 0) AS cancellation_window_hours,
    (COALESCE(ps.stripe_status, 'not_connected') = 'active') AS stripe_active
  FROM public.store_profiles sp
  LEFT JOIN public.store_payment_settings ps
    ON ps.store_id = sp.id AND ps.market = 'us'
  WHERE sp.id = p_store_id
    AND sp.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_get_payment_policy(UUID) TO anon, authenticated;
