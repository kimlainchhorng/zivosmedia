-- Salon Automated Reminders System
--
-- Plumbs three time-based reminder flows on top of the existing notification
-- infrastructure (notifications-cron hourly + send-sms + send-transactional-email):
--   1) booking_24h    — sent ~24h before a confirmed/pending booking
--   2) birthday       — sent the morning of a client's birthday (marketing)
--   3) winback        — sent when a client crosses an inactivity threshold (marketing)
--
-- New tables:
--   * salon_reminders            — state-machine row per scheduled send
--   * salon_reminder_settings    — per-store config (per-type enable, hours-before, etc.)
--
-- New columns on existing tables:
--   * salon_clients.{sms_opt_in, email_opt_in, marketing_opt_in}
--   * salon_bookings.{sms_opt_in, email_opt_in, marketing_opt_in}
--     (carried per-booking so anonymous public bookings — which never create a
--     salon_clients row — can still receive a transactional reminder.)
--
-- Triggers:
--   * tg_salon_booking_schedule_reminder  — schedule/cancel booking_24h rows
--   * tg_salon_client_winback_threshold   — schedule a winback row on the crossing
--
-- Transactional opt-ins default to true (the customer gave us a phone/email; we
-- assume basic transactional consent — same model used elsewhere in the app).
-- Marketing opt-in defaults to false (TCPA + CAN-SPAM require explicit consent).

------------------------------------------------------------------------------
-- 1. Opt-in columns
------------------------------------------------------------------------------

ALTER TABLE public.salon_clients
  ADD COLUMN IF NOT EXISTS sms_opt_in       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_opt_in     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.salon_bookings
  ADD COLUMN IF NOT EXISTS sms_opt_in       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_opt_in     BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN NOT NULL DEFAULT false;

------------------------------------------------------------------------------
-- 2. salon_reminder_settings — per-store config
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_reminder_settings (
  store_id UUID PRIMARY KEY REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  booking_reminder_enabled      BOOLEAN NOT NULL DEFAULT true,
  booking_reminder_hours_before INTEGER NOT NULL DEFAULT 24
    CHECK (booking_reminder_hours_before BETWEEN 1 AND 168),
  birthday_enabled              BOOLEAN NOT NULL DEFAULT false,
  birthday_discount_percent     INTEGER NOT NULL DEFAULT 0
    CHECK (birthday_discount_percent BETWEEN 0 AND 50),
  winback_enabled               BOOLEAN NOT NULL DEFAULT false,
  winback_days_threshold        INTEGER NOT NULL DEFAULT 60
    CHECK (winback_days_threshold BETWEEN 30 AND 365),
  sender_name                   TEXT CHECK (sender_name IS NULL OR char_length(sender_name) <= 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS salon_reminder_settings_set_updated_at ON public.salon_reminder_settings;
CREATE TRIGGER salon_reminder_settings_set_updated_at
  BEFORE UPDATE ON public.salon_reminder_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage reminder settings - all"
  ON public.salon_reminder_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_reminder_settings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_reminder_settings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

------------------------------------------------------------------------------
-- 3. salon_reminders — one row per scheduled send (state machine)
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  client_id  UUID REFERENCES public.salon_clients(id)  ON DELETE SET NULL,
  booking_id UUID REFERENCES public.salon_bookings(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL
    CHECK (reminder_type IN ('booking_24h', 'birthday', 'winback')),
  scheduled_for  TIMESTAMPTZ NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  channel_sms    BOOLEAN NOT NULL DEFAULT false,
  channel_email  BOOLEAN NOT NULL DEFAULT false,
  sent_at        TIMESTAMPTZ,
  error          TEXT CHECK (error IS NULL OR char_length(error) <= 500),
  idempotency_key TEXT NOT NULL UNIQUE
    CHECK (char_length(idempotency_key) BETWEEN 1 AND 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_reminders_due_pending_idx
  ON public.salon_reminders (scheduled_for)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS salon_reminders_store_idx
  ON public.salon_reminders (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS salon_reminders_booking_idx
  ON public.salon_reminders (booking_id)
  WHERE booking_id IS NOT NULL;

DROP TRIGGER IF EXISTS salon_reminders_set_updated_at ON public.salon_reminders;
CREATE TRIGGER salon_reminders_set_updated_at
  BEFORE UPDATE ON public.salon_reminders
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read reminders"
  ON public.salon_reminders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_reminders.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- Owners can cancel a pending reminder (e.g., from the activity log) but
-- writes are otherwise the cron's job.  Service role bypasses RLS.
CREATE POLICY "Owners cancel pending reminders"
  ON public.salon_reminders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_reminders.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_reminders.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

------------------------------------------------------------------------------
-- 4. Booking reminder schedule trigger
--    INSERT          → if active + future, schedule a booking_24h row
--    UPDATE start_at → reschedule
--    UPDATE status   → cancel pending row if booking flips out of pending/confirmed
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_salon_booking_schedule_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_hours   INTEGER;
  v_when    TIMESTAMPTZ;
  v_key     TEXT;
  v_active  BOOLEAN;
BEGIN
  -- Settings lookup: missing row => use defaults (enabled, 24h).
  SELECT booking_reminder_enabled, booking_reminder_hours_before
    INTO v_enabled, v_hours
    FROM public.salon_reminder_settings
    WHERE store_id = NEW.store_id;
  v_enabled := COALESCE(v_enabled, true);
  v_hours   := COALESCE(v_hours, 24);

  v_active := NEW.status IN ('pending', 'confirmed');
  v_when   := NEW.start_at - make_interval(hours => v_hours);
  v_key    := 'booking_24h-' || NEW.id::text;

  -- Bail early if the feature is off OR the booking is in a terminal status.
  IF NOT v_enabled THEN
    -- Cancel any existing pending row (e.g., feature got disabled after schedule).
    UPDATE public.salon_reminders
       SET status = 'cancelled', updated_at = now()
     WHERE idempotency_key = v_key AND status = 'pending';
    RETURN NEW;
  END IF;

  IF NOT v_active THEN
    -- Booking moved to completed/cancelled/no_show; cancel pending reminder.
    UPDATE public.salon_reminders
       SET status = 'cancelled', updated_at = now()
     WHERE idempotency_key = v_key AND status = 'pending';
    RETURN NEW;
  END IF;

  -- If the scheduled time has already passed (booking is < hours away),
  -- skip — no point in scheduling a reminder we'd immediately send late.
  IF v_when <= now() THEN
    RETURN NEW;
  END IF;

  -- Honor the booking's own opt-ins. If both channels are off there's nothing to send.
  IF NOT NEW.sms_opt_in AND NOT NEW.email_opt_in THEN
    UPDATE public.salon_reminders
       SET status = 'cancelled', updated_at = now()
     WHERE idempotency_key = v_key AND status = 'pending';
    RETURN NEW;
  END IF;

  INSERT INTO public.salon_reminders
    (store_id, client_id, booking_id, reminder_type, scheduled_for,
     channel_sms, channel_email, idempotency_key)
  VALUES
    (NEW.store_id, NEW.client_id, NEW.id, 'booking_24h', v_when,
     NEW.sms_opt_in AND NEW.client_phone IS NOT NULL,
     NEW.email_opt_in AND NEW.client_email IS NOT NULL,
     v_key)
  ON CONFLICT (idempotency_key) DO UPDATE
    SET scheduled_for = EXCLUDED.scheduled_for,
        channel_sms   = EXCLUDED.channel_sms,
        channel_email = EXCLUDED.channel_email,
        status        = CASE WHEN salon_reminders.status = 'sent' THEN salon_reminders.status ELSE 'pending' END,
        updated_at    = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_bookings_schedule_reminder ON public.salon_bookings;
CREATE TRIGGER salon_bookings_schedule_reminder
  AFTER INSERT OR UPDATE OF status, start_at, sms_opt_in, email_opt_in, client_phone, client_email ON public.salon_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_booking_schedule_reminder();

------------------------------------------------------------------------------
-- 5. Winback threshold trigger
--    Fires AFTER UPDATE OF last_visit_at on salon_clients. If the client was
--    previously visiting recently and just crossed the inactivity line, schedule
--    a winback row. Subsequent updates that don't cross the line do nothing.
--    Birthday reminders are NOT scheduled here — the cron picks them up by
--    scanning clients with birthday-today each morning.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_salon_client_winback_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_days    INTEGER;
  v_key     TEXT;
  v_now     TIMESTAMPTZ := now();
BEGIN
  -- Only act when last_visit_at actually transitioned past the threshold.
  IF NEW.last_visit_at IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.is_blocked THEN
    RETURN NEW;
  END IF;
  IF NEW.marketing_opt_in IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT winback_enabled, winback_days_threshold
    INTO v_enabled, v_days
    FROM public.salon_reminder_settings
    WHERE store_id = NEW.store_id;
  IF NOT COALESCE(v_enabled, false) THEN
    RETURN NEW;
  END IF;
  v_days := COALESCE(v_days, 60);

  -- We schedule the row eagerly: scheduled_for = last_visit_at + threshold days.
  -- The cron will only fire when that timestamp passes, and the idempotency_key
  -- includes the visit date so a client who returns and lapses again gets a
  -- fresh row next time around.
  v_key := 'winback-' || NEW.id::text || '-' || to_char(NEW.last_visit_at, 'YYYY-MM-DD');

  INSERT INTO public.salon_reminders
    (store_id, client_id, reminder_type, scheduled_for, channel_sms, channel_email, idempotency_key)
  VALUES
    (NEW.store_id, NEW.id, 'winback',
     NEW.last_visit_at + make_interval(days => v_days),
     NEW.sms_opt_in AND NEW.phone IS NOT NULL,
     NEW.email_opt_in AND NEW.email IS NOT NULL,
     v_key)
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_clients_winback_threshold ON public.salon_clients;
CREATE TRIGGER salon_clients_winback_threshold
  AFTER INSERT OR UPDATE OF last_visit_at, marketing_opt_in ON public.salon_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_client_winback_threshold();

------------------------------------------------------------------------------
-- 6. Public booking sanitize update — force marketing_opt_in to be EXPLICIT
--    on public inserts (anon submitter can't bypass consent). Transactional
--    opt-ins (sms/email) inherit whatever the public form sent; the customer
--    gave us their contact info so transactional consent is presumed.
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
  NEW.client_id := NULL;
  NEW.created_by_user_id := NULL;
  NEW.tip_cents := 0;
  NEW.tax_cents := 0;
  NEW.deposit_cents := 0;
  NEW.deposit_paid_cents := 0;
  NEW.deposit_paid_at := NULL;
  NEW.no_show_fee_charged_cents := 0;
  NEW.cancelled_at := NULL;
  NEW.cancellation_reason := NULL;
  NEW.internal_notes := NULL;

  -- marketing_opt_in must be EXPLICITLY set by the customer; default false if
  -- the public form didn't pass it. Transactional opt-ins (sms/email) pass
  -- through — the customer gave us the contact info so transactional
  -- consent is presumed unless they uncheck the reminder box.
  NEW.marketing_opt_in := COALESCE(NEW.marketing_opt_in, false);
  NEW.sms_opt_in       := COALESCE(NEW.sms_opt_in, true);
  NEW.email_opt_in     := COALESCE(NEW.email_opt_in, true);

  IF NEW.referral_source IS NOT NULL THEN
    NEW.referral_source := NULLIF(btrim(NEW.referral_source), '');
    IF NEW.referral_source IS NOT NULL THEN
      NEW.referral_source := left(NEW.referral_source, 120);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Extend the public-INSERT RLS policy — the new opt-in columns must be either
-- the default (transactional true / marketing false) or an explicit value;
-- they can't be set to anything weird (NULL prevented by NOT NULL DEFAULT).
DROP POLICY IF EXISTS "Public can request bookings" ON public.salon_bookings;
CREATE POLICY "Public can request bookings"
  ON public.salon_bookings
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    source = 'app'
    AND status = 'pending'
    AND client_id IS NULL
    AND created_by_user_id IS NULL
    AND tip_cents = 0
    AND tax_cents = 0
    AND deposit_cents = 0
    AND deposit_paid_cents = 0
    AND no_show_fee_charged_cents = 0
    AND service_id IS NOT NULL
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
  );

------------------------------------------------------------------------------
-- 7. notification_templates registry inserts (skip if rows already exist)
------------------------------------------------------------------------------

-- notification_templates.category is a notification_category enum:
--   'transactional' | 'account' | 'operational' | 'marketing'
-- Booking reminder is transactional (the customer asked for it implicitly by
-- booking). Birthday + winback are explicitly marketing — gated by
-- marketing_opt_in everywhere they're scanned.
INSERT INTO public.notification_templates
  (template_key, name, category, subject, body_html,
   supports_email, supports_sms, supports_in_app)
VALUES
  ('salon-booking-reminder-24h',
   'Salon — Booking reminder (24h)',
   'transactional',
   'Your appointment is tomorrow at {{salon_name}}',
   '<p>Hi {{client_first_name}},</p><p>Just a reminder: <strong>{{service_name}}</strong>{{#if stylist_name}} with {{stylist_name}}{{/if}} on <strong>{{start_at_local}}</strong>.</p><p>Need to reschedule? Reply or call {{salon_phone}}.</p><p>— {{salon_name}}</p>',
   true, true, true),
  ('salon-birthday-offer',
   'Salon — Birthday offer',
   'marketing',
   'Happy birthday from {{salon_name}}!',
   '<p>Happy birthday, {{client_first_name}}! 🎉</p><p>We''d love to see you back at {{salon_name}}. {{#if birthday_discount_percent}}Enjoy <strong>{{birthday_discount_percent}}% off</strong> your next visit.{{/if}}</p><p><a href="{{booking_url}}">Book a visit</a></p>',
   true, true, true),
  ('salon-winback-offer',
   'Salon — Winback offer',
   'marketing',
   'We miss you at {{salon_name}}',
   '<p>Hi {{client_first_name}},</p><p>It''s been {{days_since_last_visit}} days since your last visit to {{salon_name}}. We''d love to see you back.</p><p><a href="{{booking_url}}">Book a visit</a></p>',
   true, true, true)
ON CONFLICT (template_key) DO NOTHING;
