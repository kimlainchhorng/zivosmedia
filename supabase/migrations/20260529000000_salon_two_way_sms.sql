-- Two-way SMS keyword handling for salon reminders.
--
-- Existing flow (already in production):
--   * notifications-cron sends a 24h-before SMS reminder
--   * twilio-webhook handles inbound replies for CANCEL (cancels) and STOP
--     (opts out of marketing).
--
-- This migration adds:
--   1) salon_public_confirm_booking RPC — webhook calls this when a customer
--      replies YES / CONFIRM / OK to the reminder.
--   2) Extends salon_sms_inbound_log.processed_action to allow the new
--      action labels written by the extended webhook handler:
--        - 'confirmed_booking'  (customer replied YES → booking confirmed)
--        - 'notified_waitlist'  (a CANCEL freed a slot; we nudged the first
--                                waiting client)

------------------------------------------------------------------------------
-- 1. processed_action enum expansion
------------------------------------------------------------------------------

ALTER TABLE public.salon_sms_inbound_log
  DROP CONSTRAINT IF EXISTS salon_sms_inbound_log_processed_action_check;

ALTER TABLE public.salon_sms_inbound_log
  ADD CONSTRAINT salon_sms_inbound_log_processed_action_check
  CHECK (processed_action IN (
    'cancelled_booking',
    'confirmed_booking',
    'notified_waitlist',
    'opt_out',
    'unrecognized',
    'no_match',
    'signature_fail'
  ));

------------------------------------------------------------------------------
-- 2. salon_public_confirm_booking — flip pending → confirmed when the
--    customer replies YES to the reminder. Mirrors salon_public_cancel_booking:
--      - source = 'app' (the same trust model — the booking UUID is the
--        unguessable token; walk-ins are owner-confirmed via admin UI).
--      - start_at must be in the future.
--      - Only meaningful when the booking is currently `pending`.
--      - A booking already `confirmed` returns the row unchanged so the
--        webhook can render a friendly "you're already confirmed" reply
--        instead of treating it as an error.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_public_confirm_booking(UUID);

CREATE OR REPLACE FUNCTION public.salon_public_confirm_booking(p_id UUID)
RETURNS TABLE (
  id UUID,
  status TEXT,
  start_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.salon_bookings;
BEGIN
  SELECT * INTO v_row FROM public.salon_bookings WHERE salon_bookings.id = p_id;

  IF v_row.id IS NULL OR v_row.source <> 'app' THEN
    RAISE EXCEPTION 'booking not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.start_at <= now() THEN
    RAISE EXCEPTION 'this appointment has already started or passed' USING ERRCODE = 'P0001';
  END IF;
  IF v_row.status = 'confirmed' THEN
    -- Idempotent: customer replied YES twice, or already confirmed via the
    -- web. Return the current state without UPDATE.
    RETURN QUERY
      SELECT v_row.id, v_row.status::text, v_row.start_at;
    RETURN;
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'booking is % and cannot be confirmed', v_row.status USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.salon_bookings
    SET status = 'confirmed', updated_at = now()
    WHERE salon_bookings.id = p_id
    RETURNING salon_bookings.id, salon_bookings.status::text, salon_bookings.start_at
    INTO v_row.id, v_row.status, v_row.start_at;

  RETURN QUERY SELECT v_row.id, v_row.status::text, v_row.start_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_confirm_booking(UUID) TO anon, authenticated;
