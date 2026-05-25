-- Auto-expire untouched public booking requests so a malicious flood (or
-- forgetful customers) can't clog the calendar forever. Runs every 30 minutes
-- via pg_cron. Only touches app-source pending bookings older than 24 hours.

CREATE OR REPLACE FUNCTION public.salon_auto_expire_pending_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.salon_bookings
       SET status = 'cancelled',
           cancellation_reason = 'Auto-expired — unconfirmed for 24h'
     WHERE status = 'pending'
       AND source = 'app'
       AND created_at < now() - interval '24 hours'
     RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

-- Remove any prior schedule for this job (idempotent).
SELECT cron.unschedule('salon-auto-expire-pending')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'salon-auto-expire-pending');

-- Run every 30 minutes.
SELECT cron.schedule(
  'salon-auto-expire-pending',
  '*/30 * * * *',
  $$SELECT public.salon_auto_expire_pending_bookings();$$
);
