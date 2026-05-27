-- Auto-expire untouched customer-placed orders so an abandoned QR scan or a
-- malicious flood can't clog the KDS forever. Runs every 15 minutes via
-- pg_cron. Only touches orders that are still 'pending' (staff hasn't
-- accepted them yet) and came in through a customer channel; counter / phone
-- tickets entered by staff are left alone.
--
-- Mirrors salon_auto_expire_pending_bookings; cafe timeout is shorter (1h vs
-- 24h) because cafe service is same-visit — a customer who walked off won't
-- come back tomorrow.

CREATE OR REPLACE FUNCTION public.cafe_auto_expire_pending_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.cafe_orders
       SET status = 'cancelled',
           cancelled_at = now(),
           cancellation_reason = 'Auto-expired — unaccepted for 1h'
     WHERE status = 'pending'
       AND channel IN ('qr_table', 'pickup', 'delivery')
       AND placed_at < now() - interval '1 hour'
     RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

-- Idempotent unschedule + schedule, same shape as the salon version.
SELECT cron.unschedule('cafe-auto-expire-pending')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cafe-auto-expire-pending');

SELECT cron.schedule(
  'cafe-auto-expire-pending',
  '*/15 * * * *',
  $$SELECT public.cafe_auto_expire_pending_orders();$$
);
