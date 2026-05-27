-- User-account blocklist: hard-block a user_id at the edge layer, independent
-- of IP. Complements ip_blocklist for cases where an attacker rotates IPs but
-- keeps logging in to the same compromised account, or when admin wants to
-- pre-emptively freeze an account under investigation without deleting it.
--
-- Pieces:
--   1. public.user_blocklist        — admin-curated user blocks
--   2. public.is_user_blocked(uuid) — fast SECURITY DEFINER lookup
-- Edge functions check via _shared/threatIntel.ts after the IP blocklist.

CREATE TABLE IF NOT EXISTS public.user_blocklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      TEXT NOT NULL,
  created_by  UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NULL,
  notes       TEXT NULL,
  CONSTRAINT user_blocklist_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocklist_user
  ON public.user_blocklist (user_id);
CREATE INDEX IF NOT EXISTS idx_user_blocklist_expires
  ON public.user_blocklist (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.user_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocklist FORCE  ROW LEVEL SECURITY;
REVOKE ALL ON public.user_blocklist FROM anon, authenticated;

DROP POLICY IF EXISTS "user_blocklist_admin_read" ON public.user_blocklist;
CREATE POLICY "user_blocklist_admin_read"
  ON public.user_blocklist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "user_blocklist_admin_write" ON public.user_blocklist;
CREATE POLICY "user_blocklist_admin_write"
  ON public.user_blocklist FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.user_blocklist IS
  'Admin-curated user_id hard-block list. Complements ip_blocklist for '
  'attackers who rotate IPs but reuse compromised accounts.';

CREATE OR REPLACE FUNCTION public.is_user_blocked(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_blocklist
    WHERE user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.is_user_blocked(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_user_blocked(UUID)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.is_user_blocked(UUID) IS
  'Returns true if user_id is on the active user blocklist. Safe for public '
  'callers — leaks only a single boolean per known UUID.';
