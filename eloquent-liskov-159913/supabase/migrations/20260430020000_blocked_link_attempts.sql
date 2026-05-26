-- Blocked-link attempt log
--
-- Records every server-side rejection from scanContentForLinks() so the
-- security team can see which users are trying to post phishing/scam URLs
-- and which endpoints are under attack. Fire-and-forget — never blocks the
-- request that triggered it.
--
-- Schema:
--   user_id          who tried to post (nullable — auth-less callers possible)
--   endpoint         which edge function rejected it
--   urls             the blocked URLs (jsonb array of strings)
--   content_preview  first 200 chars of submitted text, for forensics
--   ip_hash          SHA-256 of source IP (no raw PII stored)
--   created_at       timestamp
--
-- Read access: admins only (via existing has_role check).
-- Write access: service_role only (edge functions write through service key).

CREATE TABLE IF NOT EXISTS public.blocked_link_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  content_preview TEXT NULL,
  ip_hash TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blocked_link_attempts_created_at
  ON public.blocked_link_attempts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocked_link_attempts_user
  ON public.blocked_link_attempts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_blocked_link_attempts_endpoint
  ON public.blocked_link_attempts (endpoint, created_at DESC);

ALTER TABLE public.blocked_link_attempts ENABLE ROW LEVEL SECURITY;

-- Admins can read everything
CREATE POLICY "blocked_link_attempts_admin_read"
  ON public.blocked_link_attempts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No INSERT/UPDATE/DELETE policy → only service_role can write (bypasses RLS).

COMMENT ON TABLE public.blocked_link_attempts IS
  'Server-side log of phishing/scam URL rejections from scanContentForLinks(). Admin-readable, service-role-writable. Fire-and-forget; never blocks the originating request.';
