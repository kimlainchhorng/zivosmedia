-- Stripe payment wiring for store-owned car-rental reservations.
-- Mirrors lodging payment schema (lodge_reservations + lodging_*_events) so the
-- existing payment patterns transplant cleanly.

------------------------------------------------------------------------
-- 1. Reservation-level payment columns
------------------------------------------------------------------------

ALTER TABLE public.car_rental_reservations
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_balance_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS last_payment_error TEXT,
  ADD COLUMN IF NOT EXISTS payment_lock_token TEXT,
  ADD COLUMN IF NOT EXISTS payment_lock_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_last_event_type TEXT;

DO $$
BEGIN
  ALTER TABLE public.car_rental_reservations
    ADD CONSTRAINT car_rental_reservations_payment_status_check
    CHECK (payment_status IN (
      'unpaid','authorized','processing','captured','paid',
      'refund_pending','refunded','failed'
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

CREATE INDEX IF NOT EXISTS car_rental_reservations_stripe_pi_idx
  ON public.car_rental_reservations (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS car_rental_reservations_stripe_balance_pi_idx
  ON public.car_rental_reservations (stripe_balance_payment_intent_id)
  WHERE stripe_balance_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS car_rental_reservations_payment_status_idx
  ON public.car_rental_reservations (store_id, payment_status);

------------------------------------------------------------------------
-- 2. Store-level Stripe / payment settings
-- The booking UI reads `car_rental_store_settings` (per-store config:
-- tax, currency, refund tiers, etc.) — not the legacy platform-level
-- `car_rental_settings`.
------------------------------------------------------------------------

ALTER TABLE public.car_rental_store_settings
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  /**
   * 'manual' = pre-authorise deposit at booking, capture balance at pickup.
   * 'immediate' = charge full total at booking.
   * Default 'manual' matches the deposit-at-booking + balance-at-checkout flow.
   */
  ADD COLUMN IF NOT EXISTS deposit_capture_mode TEXT NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  ALTER TABLE public.car_rental_store_settings
    ADD CONSTRAINT car_rental_store_settings_capture_mode_check
    CHECK (deposit_capture_mode IN ('manual','immediate'));
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

DO $$
BEGIN
  ALTER TABLE public.car_rental_store_settings
    ADD CONSTRAINT car_rental_store_settings_payment_provider_check
    CHECK (payment_provider IN ('stripe','manual'));
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

------------------------------------------------------------------------
-- 3. Payment attempt dedup table
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedup_key TEXT NOT NULL UNIQUE,
  reservation_id UUID NOT NULL REFERENCES public.car_rental_reservations(id) ON DELETE CASCADE,
  client_attempt_id TEXT,
  customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  result TEXT,
  stripe_payment_intent_id TEXT,
  stripe_client_secret TEXT
);

ALTER TABLE public.car_rental_payment_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view car-rental payment attempts"
  ON public.car_rental_payment_attempts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS car_rental_payment_attempts_reservation_idx
  ON public.car_rental_payment_attempts (reservation_id, started_at DESC);

CREATE INDEX IF NOT EXISTS car_rental_payment_attempts_in_progress_idx
  ON public.car_rental_payment_attempts (reservation_id, started_at DESC)
  WHERE completed_at IS NULL;

------------------------------------------------------------------------
-- 4. Stripe webhook event log
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_created_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reservation_id UUID,
  stripe_payment_intent_id TEXT,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','applied','skipped','error')),
  error_message TEXT,
  payload JSONB
);

ALTER TABLE public.car_rental_stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view car-rental webhook events"
  ON public.car_rental_stripe_webhook_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS car_rental_stripe_webhook_event_type_idx
  ON public.car_rental_stripe_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS car_rental_stripe_webhook_reservation_idx
  ON public.car_rental_stripe_webhook_events (reservation_id);

CREATE INDEX IF NOT EXISTS car_rental_stripe_webhook_received_at_idx
  ON public.car_rental_stripe_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS car_rental_stripe_webhook_pi_idx
  ON public.car_rental_stripe_webhook_events (stripe_payment_intent_id);

------------------------------------------------------------------------
-- 5. Realtime publication so the booking page can subscribe and flip
--    from "Waiting for confirmation" → "Confirmed" the instant the
--    webhook lands.
------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'car_rental_reservations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.car_rental_reservations;
  END IF;
END$$;
