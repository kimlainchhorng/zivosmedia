-- Salon Reminders — deferred follow-ups
--
-- Adds:
--   1) Multi-interval booking reminders (24h + 2h + …) backed by an INTEGER[]
--      setting + a generic `booking_lead` reminder type with a `lead_minutes`
--      column so the cron can format lead time naturally.
--   2) Per-store template overrides (subject / body_html / body_text / sms_body)
--      that fall back to the platform-wide notification_templates row when
--      null. Mirrors the lodge_notification_templates pattern.
--   3) Inbound SMS audit log so the twilio-webhook edge function has a single
--      idempotency key surface + an owner-readable activity record.
--
-- Backwards compat: existing salon_reminders rows of type 'booking_24h' are
-- migrated in place to 'booking_lead' with lead_minutes=1440 so the cron
-- doesn't lose any pending sends.

------------------------------------------------------------------------------
-- 1. Multi-interval settings + generic reminder_type
------------------------------------------------------------------------------

-- Add the new array column; backfill from the old scalar; drop the old.
ALTER TABLE public.salon_reminder_settings
  ADD COLUMN IF NOT EXISTS booking_reminder_lead_hours INTEGER[] NOT NULL DEFAULT '{24}';

-- Backfill from the prior scalar, if it still exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'salon_reminder_settings'
      AND column_name = 'booking_reminder_hours_before'
  ) THEN
    UPDATE public.salon_reminder_settings
      SET booking_reminder_lead_hours = ARRAY[booking_reminder_hours_before]
      WHERE booking_reminder_hours_before IS NOT NULL
        AND (booking_reminder_lead_hours IS NULL OR booking_reminder_lead_hours = '{24}');
    ALTER TABLE public.salon_reminder_settings
      DROP COLUMN booking_reminder_hours_before;
  END IF;
END $$;

-- Enforce 1..168 per element and array length 1..5.
ALTER TABLE public.salon_reminder_settings
  DROP CONSTRAINT IF EXISTS salon_reminder_settings_lead_hours_check;
ALTER TABLE public.salon_reminder_settings
  ADD CONSTRAINT salon_reminder_settings_lead_hours_check
  CHECK (
    array_length(booking_reminder_lead_hours, 1) BETWEEN 1 AND 5
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(booking_reminder_lead_hours) AS h
      WHERE h < 1 OR h > 168
    )
  );

-- Drop the old single-value reminder_type CHECK, re-add wider one.
ALTER TABLE public.salon_reminders
  DROP CONSTRAINT IF EXISTS salon_reminders_reminder_type_check;

-- Add the lead_minutes column (nullable; only booking_lead rows use it).
ALTER TABLE public.salon_reminders
  ADD COLUMN IF NOT EXISTS lead_minutes INTEGER
    CHECK (lead_minutes IS NULL OR (lead_minutes BETWEEN 1 AND 168 * 60));

-- Backfill: every 'booking_24h' row becomes 'booking_lead' with 1440 minutes.
UPDATE public.salon_reminders
   SET reminder_type = 'booking_lead',
       lead_minutes = 1440,
       updated_at = now()
 WHERE reminder_type = 'booking_24h';

ALTER TABLE public.salon_reminders
  ADD CONSTRAINT salon_reminders_reminder_type_check
  CHECK (reminder_type IN ('booking_lead', 'birthday', 'winback'));

------------------------------------------------------------------------------
-- 2. Rewrite booking-schedule trigger to fan out to N intervals
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_salon_booking_schedule_reminder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled BOOLEAN;
  v_lead_hours INTEGER[];
  v_h INTEGER;
  v_lead_minutes INTEGER;
  v_when TIMESTAMPTZ;
  v_key TEXT;
  v_active BOOLEAN;
BEGIN
  SELECT booking_reminder_enabled, booking_reminder_lead_hours
    INTO v_enabled, v_lead_hours
    FROM public.salon_reminder_settings
    WHERE store_id = NEW.store_id;
  v_enabled := COALESCE(v_enabled, true);
  v_lead_hours := COALESCE(v_lead_hours, ARRAY[24]);

  v_active := NEW.status IN ('pending', 'confirmed');

  -- Feature off OR booking in terminal status → cancel ALL pending booking
  -- reminders for this booking.
  IF NOT v_enabled OR NOT v_active THEN
    UPDATE public.salon_reminders
       SET status = 'cancelled', updated_at = now()
     WHERE booking_id = NEW.id
       AND reminder_type = 'booking_lead'
       AND status = 'pending';
    RETURN NEW;
  END IF;

  -- Honour opt-ins (both channels off → nothing to send).
  IF NOT NEW.sms_opt_in AND NOT NEW.email_opt_in THEN
    UPDATE public.salon_reminders
       SET status = 'cancelled', updated_at = now()
     WHERE booking_id = NEW.id
       AND reminder_type = 'booking_lead'
       AND status = 'pending';
    RETURN NEW;
  END IF;

  -- Fan out one row per configured interval.
  FOREACH v_h IN ARRAY v_lead_hours LOOP
    v_lead_minutes := v_h * 60;
    v_when := NEW.start_at - make_interval(hours => v_h);
    v_key := 'booking_lead-' || NEW.id::text || '-' || v_lead_minutes::text;

    -- Don't schedule a row whose send time has already passed.
    IF v_when <= now() THEN
      CONTINUE;
    END IF;

    INSERT INTO public.salon_reminders
      (store_id, client_id, booking_id, reminder_type, scheduled_for,
       channel_sms, channel_email, idempotency_key, lead_minutes)
    VALUES
      (NEW.store_id, NEW.client_id, NEW.id, 'booking_lead', v_when,
       NEW.sms_opt_in AND NEW.client_phone IS NOT NULL,
       NEW.email_opt_in AND NEW.client_email IS NOT NULL,
       v_key, v_lead_minutes)
    ON CONFLICT (idempotency_key) DO UPDATE
      SET scheduled_for = EXCLUDED.scheduled_for,
          channel_sms   = EXCLUDED.channel_sms,
          channel_email = EXCLUDED.channel_email,
          status        = CASE WHEN salon_reminders.status = 'sent' THEN salon_reminders.status ELSE 'pending' END,
          updated_at    = now();
  END LOOP;

  -- Clean up: any pending booking_lead rows for this booking whose
  -- lead_minutes is NOT in the current settings array → cancel them.
  -- (Owner removed an interval; existing rows shouldn't fire.)
  UPDATE public.salon_reminders
     SET status = 'cancelled', updated_at = now()
   WHERE booking_id = NEW.id
     AND reminder_type = 'booking_lead'
     AND status = 'pending'
     AND lead_minutes IS NOT NULL
     AND NOT (lead_minutes = ANY(
       SELECT h * 60 FROM unnest(v_lead_hours) AS h
     ));

  RETURN NEW;
END;
$$;

------------------------------------------------------------------------------
-- 3. Per-store template overrides
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_notification_template_overrides (
  store_id     UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  subject      TEXT CHECK (subject IS NULL OR char_length(subject) <= 200),
  body_html    TEXT CHECK (body_html IS NULL OR char_length(body_html) <= 20000),
  body_text    TEXT CHECK (body_text IS NULL OR char_length(body_text) <= 20000),
  sms_body     TEXT CHECK (sms_body IS NULL OR char_length(sms_body) <= 320),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, template_key)
);

DROP TRIGGER IF EXISTS salon_notification_template_overrides_set_updated_at
  ON public.salon_notification_template_overrides;
CREATE TRIGGER salon_notification_template_overrides_set_updated_at
  BEFORE UPDATE ON public.salon_notification_template_overrides
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_notification_template_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their template overrides"
  ON public.salon_notification_template_overrides
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_notification_template_overrides.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_notification_template_overrides.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- Service role / edge functions read overrides freely.
-- (No service-role policy needed — service role bypasses RLS.)

------------------------------------------------------------------------------
-- 4. Inbound SMS audit log
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_sms_inbound_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  from_phone TEXT NOT NULL CHECK (char_length(from_phone) BETWEEN 1 AND 30),
  to_phone   TEXT CHECK (to_phone IS NULL OR char_length(to_phone) <= 30),
  message_sid TEXT UNIQUE CHECK (char_length(message_sid) BETWEEN 1 AND 64),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 1600),
  processed_action TEXT CHECK (processed_action IN ('cancelled_booking', 'opt_out', 'unrecognized', 'no_match', 'signature_fail')),
  affected_booking_id UUID REFERENCES public.salon_bookings(id) ON DELETE SET NULL,
  affected_store_id UUID REFERENCES public.store_profiles(id) ON DELETE SET NULL,
  affected_client_phone TEXT,
  reply_sent BOOLEAN NOT NULL DEFAULT false,
  reply_error TEXT CHECK (reply_error IS NULL OR char_length(reply_error) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_sms_inbound_log_from_phone_idx
  ON public.salon_sms_inbound_log (from_phone, received_at DESC);
CREATE INDEX IF NOT EXISTS salon_sms_inbound_log_store_idx
  ON public.salon_sms_inbound_log (affected_store_id, received_at DESC)
  WHERE affected_store_id IS NOT NULL;

ALTER TABLE public.salon_sms_inbound_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read inbound SMS logs for their store"
  ON public.salon_sms_inbound_log
  FOR SELECT
  TO authenticated
  USING (
    (affected_store_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_sms_inbound_log.affected_store_id
        AND sp.owner_id = (SELECT auth.uid())
    ))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
