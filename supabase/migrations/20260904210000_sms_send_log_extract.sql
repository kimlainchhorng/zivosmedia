-- Extract of the sms_send_log piece from 20260509120000_unified_notifications.sql.
--
-- The parent file mixes this inert audit table with behavioral changes to LIVE
-- tables (create-or-replace of the live enqueue_notification function and new
-- notification triggers on user_followers / post_likes / post_comments /
-- food_orders / ride_requests / lodge_reservations / flight_bookings), so it
-- must not be applied whole — the live notification system is itself partially
-- hand-applied (enqueue_notification exists; the triggers do not). This
-- extract creates only the audit table the deployed send-sms function writes
-- to. Idempotent; purely additive; RLS self-read only.

CREATE TABLE IF NOT EXISTS public.sms_send_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type          TEXT,
  destination_masked  TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',
  provider            TEXT NOT NULL DEFAULT 'twilio',
  provider_message_id TEXT,
  error_message       TEXT,
  sent_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_user ON public.sms_send_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_send_log_status ON public.sms_send_log(status, created_at DESC);
ALTER TABLE public.sms_send_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sms_send_log_self_read" ON public.sms_send_log;
CREATE POLICY "sms_send_log_self_read" ON public.sms_send_log
  FOR SELECT USING (auth.uid() = user_id);
