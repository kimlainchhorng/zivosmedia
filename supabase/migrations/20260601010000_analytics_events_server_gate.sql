-- Restrict analytics_events writes to the server-side ingestion function.
-- Browser callers must use a trusted server-side analytics ingestion function so event names, metadata size,
-- CORS, rate limits, and network-risk checks are enforced before insert.

DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_insert_anon" ON public.analytics_events;
DROP POLICY IF EXISTS "analytics_insert_auth" ON public.analytics_events;

COMMENT ON TABLE public.analytics_events IS
  'Client analytics telemetry. Inserts are restricted to trusted server-side ingestion via an Edge Function.';
