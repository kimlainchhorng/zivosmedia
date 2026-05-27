
-- ============================================================================
-- CYBERSECURITY HARDENING — PHASE 1
-- Fixes 2 critical security findings + adds audit log infrastructure.
-- Safe / non-breaking: keeps current app behavior via security-definer wrappers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) profiles: hide PII from non-owners via column-level grants.
--    Public listing keeps working (id, username, full_name, avatar, bio, etc.)
--    Sensitive columns are no longer readable by 'authenticated' or 'anon'.
--    Owners read their own row via get_my_profile() RPC; admins via service_role.
-- ----------------------------------------------------------------------------

REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  full_name,
  username,
  avatar_url,
  cover_url,
  cover_position,
  bio,
  is_verified,
  is_private,
  profile_visibility,
  display_brand_name,
  social_facebook, social_instagram, social_tiktok, social_snapchat,
  social_x, social_linkedin, social_telegram, social_onlyfans,
  social_links_visible, social_links,
  comment_control, hide_like_counts, allow_mentions, allow_sharing,
  allow_friend_requests,
  hide_from_drivers,
  selected_city_id, selected_city_name, zone_id,
  loyalty_tier_id,
  affiliate_partner_name,
  status, last_seen, role,
  setup_complete,
  created_at, updated_at
) ON public.profiles TO authenticated, anon;

-- Owner-only read of full row, including PII.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Admin-only read of any full row.
CREATE OR REPLACE FUNCTION public.admin_get_profile(_user_id uuid)
RETURNS public.profiles
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT * FROM public.profiles
  WHERE id = _user_id AND public.has_role(auth.uid(), 'admin'::public.app_role)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_get_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_profile(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2) user_cvs: replace broken share-code policy with a secret-required RPC.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anyone can view shared CVs by share_code" ON public.user_cvs;

CREATE OR REPLACE FUNCTION public.get_cv_by_share_code(_share_code text)
RETURNS SETOF public.user_cvs
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT *
  FROM public.user_cvs
  WHERE share_code IS NOT NULL
    AND share_code = _share_code
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_cv_by_share_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cv_by_share_code(text) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3) security_audit_log — append-only audit trail for sensitive events.
--    Writers: service_role only (via edge functions).
--    Readers: admins.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_id uuid,
  event text NOT NULL,
  ip text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_user ON public.security_audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_event ON public.security_audit_log (event, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read security audit"
  ON public.security_audit_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- INSERT/UPDATE/DELETE intentionally have no policies — only service_role can write.

-- ----------------------------------------------------------------------------
-- 4) csp_violations — store CSP report-only violations for tuning.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.csp_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_uri text,
  violated_directive text,
  blocked_uri text,
  source_file text,
  line_number int,
  user_agent text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_csp_violations_directive ON public.csp_violations (violated_directive, created_at DESC);

ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read csp violations"
  ON public.csp_violations
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
