-- Restrict legal dispute filing to the legal-dispute-file Edge Function.
-- The function binds complainant_id from the auth token, forces open status,
-- validates dispute payloads, and writes a service-role legal audit row.

DROP POLICY IF EXISTS "ld_user_insert" ON public.legal_disputes;

COMMENT ON TABLE public.legal_disputes IS
  'Legal dispute records. Inserts are restricted to trusted server-side ingestion via the legal-dispute-file Edge Function.';
