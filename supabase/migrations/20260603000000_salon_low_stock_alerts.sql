-- Daily low-stock digest for salon retail products.
--
-- The salon retail flow already decrements stock on booking completion
-- (see 20260524100000_salon_booking_retail_items.sql + the completion
-- trigger). What's missing is the proactive nudge — owners shouldn't have
-- to open the app to discover they're out of acetone. This migration:
--
--   1) Adds `last_low_stock_alert_at` to products so the digest dedups —
--      we don't email about the same low item every day until the owner
--      restocks.
--   2) Adds a service-role RPC that returns currently-low products that
--      haven't been alerted in the last 6 days.
--   3) Schedules a daily pg_cron job to POST to the new salon-low-stock-
--      digest edge function (the function does the actual emailing).

------------------------------------------------------------------------------
-- 1. Alert-state column
------------------------------------------------------------------------------

ALTER TABLE public.salon_retail_products
  ADD COLUMN IF NOT EXISTS last_low_stock_alert_at TIMESTAMPTZ;

------------------------------------------------------------------------------
-- 2. RPC the digest function calls. Returns one row per low-stock product
--    needing an alert. Scoped to a single store so the function can call
--    it per-store inside its loop. Service-role only — there's no public
--    flow that needs this.
------------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.salon_get_low_stock_for_store(UUID);

CREATE OR REPLACE FUNCTION public.salon_get_low_stock_for_store(p_store_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  stock_quantity INTEGER,
  low_stock_threshold INTEGER,
  sku TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.name,
    p.stock_quantity,
    p.low_stock_threshold,
    p.sku
  FROM public.salon_retail_products p
  WHERE p.store_id = p_store_id
    AND p.is_active = true
    AND p.stock_quantity <= p.low_stock_threshold
    -- Dedup: don't re-alert if we emailed within the last 6 days. Six
    -- (not seven) gives the daily cron a one-day buffer before the alert
    -- repeats — better to nag once extra than miss a refill cycle.
    AND (p.last_low_stock_alert_at IS NULL
         OR p.last_low_stock_alert_at < (now() - interval '6 days'))
  ORDER BY (p.low_stock_threshold - p.stock_quantity) DESC, p.name ASC
  LIMIT 200;
$$;

REVOKE EXECUTE ON FUNCTION public.salon_get_low_stock_for_store(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.salon_get_low_stock_for_store(UUID) TO service_role;

------------------------------------------------------------------------------
-- 3. Daily pg_cron schedule. Fires once per day at 14:00 UTC (≈ 9 AM
--    Eastern / 6 AM Pacific) — early enough that owners see it with their
--    morning coffee, late enough that yesterday's last-minute sales are
--    already counted.
--
--    URL + Authorization header mirror the pattern used by
--    20260509180000_notifications_cron_schedule.sql.
------------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('salon-low-stock-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'salon-low-stock-daily',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/salon-low-stock-digest',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
