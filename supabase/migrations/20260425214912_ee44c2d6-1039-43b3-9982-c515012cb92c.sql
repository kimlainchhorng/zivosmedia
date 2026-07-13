
-- 2) IDEMPOTENCY RECORDS
CREATE TABLE IF NOT EXISTS public.idempotency_records (
  key text NOT NULL,
  route text NOT NULL,
  user_id uuid,
  response_hash text,
  status_code int,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (key, route)
);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.idempotency_records USING brin (expires_at);
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "idempotency service only" ON public.idempotency_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3) NONCE CACHE
CREATE TABLE IF NOT EXISTS public.nonce_cache (
  nonce text PRIMARY KEY,
  route text NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes')
);
CREATE INDEX IF NOT EXISTS idx_nonce_expires ON public.nonce_cache USING brin (expires_at);
ALTER TABLE public.nonce_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nonce_cache service only" ON public.nonce_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4) JOBS QUEUE
CREATE TABLE IF NOT EXISTS public.jobs_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','succeeded','failed','dead')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  last_error text,
  run_at timestamptz NOT NULL DEFAULT now(),
  locked_by text,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_pending ON public.jobs_queue (run_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_jobs_kind_status ON public.jobs_queue (kind, status);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON public.jobs_queue USING brin (created_at);
ALTER TABLE public.jobs_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_queue service only" ON public.jobs_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "jobs_queue admin read" ON public.jobs_queue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_jobs_queue_updated
  BEFORE UPDATE ON public.jobs_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) USER CONSENTS LEDGER
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  version text NOT NULL DEFAULT '1',
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON public.user_consents (user_id, kind, granted_at DESC);
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_consents own select" ON public.user_consents
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_consents own insert" ON public.user_consents
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_consents own update" ON public.user_consents
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_consents service all" ON public.user_consents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7) USER MFA FACTORS
CREATE TABLE IF NOT EXISTS public.user_mfa_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('totp','backup_codes','webauthn')),
  friendly_name text,
  secret_encrypted text,
  backup_codes_hash text[],
  verified_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mfa_user ON public.user_mfa_factors (user_id);
ALTER TABLE public.user_mfa_factors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mfa own select" ON public.user_mfa_factors
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "mfa own delete" ON public.user_mfa_factors
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "mfa service all" ON public.user_mfa_factors
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- HOUSEKEEPING
CREATE OR REPLACE FUNCTION public.cleanup_expired_security_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.idempotency_records WHERE expires_at < now();
  DELETE FROM public.nonce_cache WHERE expires_at < now();
END;
$$;
