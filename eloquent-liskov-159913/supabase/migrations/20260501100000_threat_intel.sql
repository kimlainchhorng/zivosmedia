-- Threat intelligence: aggregated attacker history + IP blocklist.
--
-- WHY: existing security tables (security_events, security_incidents,
-- blocked_link_attempts, audit_logs, chat_security_events) each capture one
-- slice of attacker behaviour. Before deciding to block a given IP/user the
-- security team needs to see ALL signals together — "what is this actor's
-- complete history?". This migration exposes that as one RPC and adds a
-- service-role-readable IP blocklist that edge functions can short-circuit on.
--
-- Pieces:
--   1. public.ip_blocklist        — admin-curated hard blocks, expiring or perm
--   2. public.is_ip_blocked()     — fast SECURITY DEFINER lookup for edge fns
--   3. public.get_threat_history()— admin-only aggregated history view
--   4. public.audit_unforced_rls()— admin tool to find tables w/o FORCE RLS
--   5. FORCE ROW LEVEL SECURITY on the new ip_blocklist table

-- ── 1. IP blocklist ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ip_blocklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash     TEXT NOT NULL,                       -- SHA-256(raw_ip), no PII
  reason      TEXT NOT NULL,
  created_by  UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NULL,                    -- NULL = permanent
  notes       TEXT NULL,
  CONSTRAINT ip_blocklist_ip_hash_unique UNIQUE (ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_ip_blocklist_ip_hash
  ON public.ip_blocklist (ip_hash);
CREATE INDEX IF NOT EXISTS idx_ip_blocklist_expires
  ON public.ip_blocklist (expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.ip_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blocklist FORCE  ROW LEVEL SECURITY;
REVOKE ALL ON public.ip_blocklist FROM anon, authenticated;

DROP POLICY IF EXISTS "ip_blocklist_admin_read" ON public.ip_blocklist;
CREATE POLICY "ip_blocklist_admin_read"
  ON public.ip_blocklist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ip_blocklist_admin_write" ON public.ip_blocklist;
CREATE POLICY "ip_blocklist_admin_write"
  ON public.ip_blocklist FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

COMMENT ON TABLE public.ip_blocklist IS
  'Admin-curated IP hard-block list (SHA-256 of IP, no raw PII). '
  'Edge functions check via public.is_ip_blocked() before any handler work.';

-- ── 2. Fast blocklist lookup (callable by anyone — only returns boolean) ─────
CREATE OR REPLACE FUNCTION public.is_ip_blocked(_ip_hash TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ip_blocklist
    WHERE ip_hash = _ip_hash
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.is_ip_blocked(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_ip_blocked(TEXT) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.is_ip_blocked(TEXT) IS
  'Returns true if the SHA-256 hash of an IP is on the active blocklist. '
  'Safe for public callers — leaks only a single boolean per known hash.';

-- ── 3. Aggregated threat history (admin-only) ────────────────────────────────
-- Returns a per-source row count, total count, severity peak, last-seen
-- timestamp, and a JSON sample of recent events for the IP and/or user across
-- ALL security tables. This is the "check history before protect" view.
--
-- Args:
--   _ip_address TEXT  — raw IP for security_events / audit_logs match (nullable)
--   _ip_hash    TEXT  — SHA-256 of IP for blocked_link_attempts match (nullable)
--   _user_id    UUID  — actor user id (nullable)
--   _hours      INT   — lookback window, default 168h (7d), max 720h (30d)
--
-- Returns columns:
--   source        TEXT   — table name
--   total_count   BIGINT
--   blocked_count BIGINT
--   max_severity  TEXT
--   last_seen     TIMESTAMPTZ
--   sample        JSONB  — up to 5 recent rows (PII redacted)
CREATE OR REPLACE FUNCTION public.get_threat_history(
  _ip_address TEXT DEFAULT NULL,
  _ip_hash    TEXT DEFAULT NULL,
  _user_id    UUID DEFAULT NULL,
  _hours      INT  DEFAULT 168
)
RETURNS TABLE (
  source        TEXT,
  total_count   BIGINT,
  blocked_count BIGINT,
  max_severity  TEXT,
  last_seen     TIMESTAMPTZ,
  sample        JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since TIMESTAMPTZ;
  v_hours INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _ip_address IS NULL AND _ip_hash IS NULL AND _user_id IS NULL THEN
    RAISE EXCEPTION 'must supply at least one of _ip_address, _ip_hash, _user_id';
  END IF;

  v_hours := LEAST(GREATEST(COALESCE(_hours, 168), 1), 720);
  v_since := now() - make_interval(hours => v_hours);

  -- security_events
  RETURN QUERY
  SELECT
    'security_events'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE is_blocked)::BIGINT,
    (ARRAY_AGG(severity ORDER BY
      CASE severity WHEN 'critical' THEN 4 WHEN 'error' THEN 3
                    WHEN 'warn' THEN 2 ELSE 1 END DESC))[1]::TEXT,
    MAX(created_at),
    COALESCE(
      (SELECT jsonb_agg(row_to_json(s) ORDER BY s.created_at DESC)
         FROM (
           SELECT id, event_type, severity, is_blocked, created_at,
                  LEFT(COALESCE(user_agent, ''), 120) AS user_agent
             FROM public.security_events
            WHERE created_at >= v_since
              AND ((_ip_address IS NOT NULL AND ip_address::TEXT = _ip_address)
                OR (_user_id    IS NOT NULL AND user_id    = _user_id))
            ORDER BY created_at DESC
            LIMIT 5
         ) s),
      '[]'::jsonb)
  FROM public.security_events
  WHERE created_at >= v_since
    AND ((_ip_address IS NOT NULL AND ip_address::TEXT = _ip_address)
      OR (_user_id    IS NOT NULL AND user_id    = _user_id))
  HAVING COUNT(*) > 0;

  -- blocked_link_attempts
  RETURN QUERY
  SELECT
    'blocked_link_attempts'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*)::BIGINT,
    'warn'::TEXT,
    MAX(created_at),
    COALESCE(
      (SELECT jsonb_agg(row_to_json(s) ORDER BY s.created_at DESC)
         FROM (
           SELECT id, endpoint, urls, created_at,
                  LEFT(COALESCE(content_preview, ''), 120) AS content_preview
             FROM public.blocked_link_attempts
            WHERE created_at >= v_since
              AND ((_ip_hash IS NOT NULL AND ip_hash = _ip_hash)
                OR (_user_id IS NOT NULL AND user_id = _user_id))
            ORDER BY created_at DESC
            LIMIT 5
         ) s),
      '[]'::jsonb)
  FROM public.blocked_link_attempts
  WHERE created_at >= v_since
    AND ((_ip_hash IS NOT NULL AND ip_hash = _ip_hash)
      OR (_user_id IS NOT NULL AND user_id = _user_id))
  HAVING COUNT(*) > 0;

  -- security_incidents (acked / unacked across all sources)
  RETURN QUERY
  SELECT
    'security_incidents'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE NOT acknowledged)::BIGINT,
    (ARRAY_AGG(severity ORDER BY
      CASE severity WHEN 'critical' THEN 4 WHEN 'high' THEN 3
                    WHEN 'medium'   THEN 2 ELSE 1 END DESC))[1]::TEXT,
    MAX(created_at),
    COALESCE(
      (SELECT jsonb_agg(row_to_json(s) ORDER BY s.created_at DESC)
         FROM (
           SELECT id, source, severity, summary, acknowledged, created_at
             FROM public.security_incidents
            WHERE created_at >= v_since
            ORDER BY created_at DESC
            LIMIT 5
         ) s),
      '[]'::jsonb)
  FROM public.security_incidents
  WHERE created_at >= v_since
  HAVING COUNT(*) > 0;

  -- chat_security_events (only if user_id given; this table keys on sender)
  IF _user_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'chat_security_events'::TEXT,
      COUNT(*)::BIGINT,
      COUNT(*) FILTER (WHERE blocked)::BIGINT,
      (CASE WHEN MAX(risk_score) >= 80 THEN 'critical'
            WHEN MAX(risk_score) >= 50 THEN 'high'
            WHEN MAX(risk_score) >= 20 THEN 'medium'
            ELSE 'low' END)::TEXT,
      MAX(created_at),
      COALESCE(
        (SELECT jsonb_agg(row_to_json(s) ORDER BY s.created_at DESC)
           FROM (
             SELECT id, source_table, blocked, risk_score, risk_labels, created_at
               FROM public.chat_security_events
              WHERE created_at >= v_since
                AND sender_id = _user_id
              ORDER BY created_at DESC
              LIMIT 5
           ) s),
        '[]'::jsonb)
    FROM public.chat_security_events
    WHERE created_at >= v_since
      AND sender_id = _user_id
    HAVING COUNT(*) > 0;
  END IF;

  -- ip_blocklist (current standing)
  RETURN QUERY
  SELECT
    'ip_blocklist'::TEXT,
    COUNT(*)::BIGINT,
    COUNT(*)::BIGINT,
    'critical'::TEXT,
    MAX(created_at),
    COALESCE(
      (SELECT jsonb_agg(row_to_json(s) ORDER BY s.created_at DESC)
         FROM (
           SELECT id, reason, created_at, expires_at,
                  LEFT(COALESCE(notes, ''), 120) AS notes
             FROM public.ip_blocklist
            WHERE _ip_hash IS NOT NULL AND ip_hash = _ip_hash
            ORDER BY created_at DESC
            LIMIT 5
         ) s),
      '[]'::jsonb)
  FROM public.ip_blocklist
  WHERE _ip_hash IS NOT NULL AND ip_hash = _ip_hash
  HAVING COUNT(*) > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.get_threat_history(TEXT, TEXT, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_threat_history(TEXT, TEXT, UUID, INT)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_threat_history(TEXT, TEXT, UUID, INT) IS
  'Admin-only. Aggregates attacker history across security_events, '
  'blocked_link_attempts, security_incidents, chat_security_events, and '
  'ip_blocklist for a given IP / IP-hash / user_id within the given window.';

-- ── 4. RLS posture audit (admin tool) ────────────────────────────────────────
-- Lists public-schema tables that have RLS enabled but NOT FORCED. Without
-- FORCE, owners and superusers bypass RLS — service_role accidentally writing
-- as a PII-table owner would skip policies. Run periodically.
CREATE OR REPLACE FUNCTION public.audit_unforced_rls()
RETURNS TABLE (
  table_name      TEXT,
  rls_enabled     BOOLEAN,
  rls_forced      BOOLEAN,
  policy_count    BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    c.relname::TEXT,
    c.relrowsecurity,
    c.relforcerowsecurity,
    COALESCE((SELECT COUNT(*) FROM pg_policy p WHERE p.polrelid = c.oid), 0)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = true
    AND c.relforcerowsecurity = false
  ORDER BY c.relname;
$$;

REVOKE ALL ON FUNCTION public.audit_unforced_rls() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_unforced_rls() TO authenticated;

-- Wrap the audit in an admin guard at the SQL level — the function above is
-- safe to expose since it returns only metadata, but we still gate it.
CREATE OR REPLACE FUNCTION public.admin_audit_unforced_rls()
RETURNS TABLE (
  table_name   TEXT,
  rls_enabled  BOOLEAN,
  rls_forced   BOOLEAN,
  policy_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT * FROM public.audit_unforced_rls();
END;
$$;

REVOKE ALL ON FUNCTION public.admin_audit_unforced_rls() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_audit_unforced_rls() TO authenticated;

COMMENT ON FUNCTION public.admin_audit_unforced_rls() IS
  'Admin-only. Lists public tables with RLS ENABLED but NOT FORCED — these '
  'allow owner/superuser bypass and should be reviewed.';
