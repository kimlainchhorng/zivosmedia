-- Restrict affiliate click log writes to trusted server-side tracking.
-- Browser callers must use the affiliate-click-log Edge Function so request
-- validation, CORS, rate limits, network-risk tracking, and user attribution
-- happen before rows are written.

DROP POLICY IF EXISTS "Anyone can insert click logs" ON public.affiliate_click_logs;

COMMENT ON TABLE public.affiliate_click_logs IS
  'Affiliate click telemetry. Inserts are restricted to trusted server-side tracking via the affiliate-click-log Edge Function.';
