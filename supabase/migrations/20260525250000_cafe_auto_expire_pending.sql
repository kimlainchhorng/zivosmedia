-- Auto-expire untouched cafe orders so abandoned QR carts don't clog the
-- kitchen forever. Runs every 15 minutes via pg_cron. Only touches
-- customer-channel pending orders older than 60 minutes — counter orders
-- placed by staff are never touched (the till is the source of truth).

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
           cancelled_at = COALESCE(cancelled_at, now()),
           cancellation_reason = 'auto_expired'
     WHERE status = 'pending'
       AND channel IN ('qr_table', 'pickup', 'delivery', 'phone')
       AND placed_at < now() - interval '60 minutes'
     RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$$;

-- Remove any prior schedule for this job (idempotent).
SELECT cron.unschedule('cafe-auto-expire-pending')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cafe-auto-expire-pending');

-- Run every 15 minutes — bounded sweep so a customer placed-but-forgotten
-- order doesn't sit pending for a whole shift.
SELECT cron.schedule(
  'cafe-auto-expire-pending',
  '*/15 * * * *',
  $$SELECT public.cafe_auto_expire_pending_orders();$$
);
