-- Review-request reminder (post-visit nudge).
--
-- Existing reminders cover the lead-up (booking_lead) and marketing pings
-- (birthday, winback). This adds a "how was your visit?" nudge sent N
-- hours after a completed visit, deep-linking to the existing
-- /review/:bookingId form. Owner toggles + tunes the offset; the
-- notifications-cron scan creates a salon_reminders row when a completed
-- booking enters the send window.
--
-- Touches:
--   1) salon_reminder_settings — adds `review_request_enabled` +
--      `review_request_hours_after`.
--   2) salon_reminders check constraint — widens to include
--      'review_request'.

------------------------------------------------------------------------------
-- 1. Settings columns
------------------------------------------------------------------------------

ALTER TABLE public.salon_reminder_settings
  ADD COLUMN IF NOT EXISTS review_request_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_request_hours_after INTEGER NOT NULL DEFAULT 72;

ALTER TABLE public.salon_reminder_settings
  DROP CONSTRAINT IF EXISTS salon_reminder_settings_review_hours_chk;
ALTER TABLE public.salon_reminder_settings
  ADD CONSTRAINT salon_reminder_settings_review_hours_chk
  CHECK (review_request_hours_after BETWEEN 1 AND 720);

------------------------------------------------------------------------------
-- 2. Widen reminder_type CHECK. Previous migration restricted it to
--    ('booking_lead', 'birthday', 'winback') — we add 'review_request'.
------------------------------------------------------------------------------

ALTER TABLE public.salon_reminders
  DROP CONSTRAINT IF EXISTS salon_reminders_reminder_type_check;

ALTER TABLE public.salon_reminders
  ADD CONSTRAINT salon_reminders_reminder_type_check
  CHECK (reminder_type IN ('booking_lead', 'birthday', 'winback', 'review_request'));
