-- Restrict acceptance evidence writes to the legal-acceptance-record Edge Function.
-- The function binds user_id from the auth token and writes a service-role audit
-- row, so clients cannot forge acceptance user ids or legal audit context.

DROP POLICY IF EXISTS "ucl_user_insert" ON public.user_consent_logs;
DROP POLICY IF EXISTS "rta_user_insert" ON public.role_terms_acceptance;

COMMENT ON TABLE public.user_consent_logs IS
  'Policy acceptance evidence. Inserts are restricted to trusted server-side ingestion via the legal-acceptance-record Edge Function.';

COMMENT ON TABLE public.role_terms_acceptance IS
  'Role terms acceptance evidence. Inserts are restricted to trusted server-side ingestion via the legal-acceptance-record Edge Function.';
