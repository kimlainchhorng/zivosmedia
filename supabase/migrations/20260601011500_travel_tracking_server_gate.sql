-- Restrict travel tracking writes to the server-side ingestion function.
-- Browser callers must use travel-tracking-log so search/redirect telemetry
-- is validated, rate-limited, and attributed from the auth token server-side.

DROP POLICY IF EXISTS "Anyone can create search sessions" ON public.search_sessions;
DROP POLICY IF EXISTS "Authenticated can insert redirect logs" ON public.partner_redirect_logs;
DROP POLICY IF EXISTS "abandoned_insert_own_email" ON public.abandoned_searches;
DROP POLICY IF EXISTS "abandoned_insert_auth" ON public.abandoned_searches;

COMMENT ON TABLE public.search_sessions IS
  'Travel search session telemetry. Inserts are restricted to trusted server-side ingestion via the travel-tracking-log Edge Function.';

COMMENT ON TABLE public.partner_redirect_logs IS
  'Partner redirect telemetry. Inserts are restricted to trusted server-side ingestion via the travel-tracking-log Edge Function.';

COMMENT ON TABLE public.abandoned_searches IS
  'Abandoned search telemetry containing email addresses. Inserts are restricted to trusted server-side ingestion via the travel-tracking-log Edge Function.';
