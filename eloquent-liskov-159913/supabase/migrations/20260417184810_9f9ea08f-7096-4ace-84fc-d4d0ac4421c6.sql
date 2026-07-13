-- Extend live_pair_sessions for paired-device streaming
ALTER TABLE public.live_pair_sessions
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS device_expires_at timestamptz;

-- Patch confirm_live_pair_session: extend expiry to 24h on confirm for ongoing device use
CREATE OR REPLACE FUNCTION public.confirm_live_pair_session(p_token text, p_user_agent text DEFAULT NULL)
RETURNS TABLE(session_id uuid, store_id uuid, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_store_id uuid;
  v_status text;
  v_row public.live_pair_sessions%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.live_pair_sessions lps
  WHERE lps.token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pair session not found';
  END IF;

  IF v_row.expires_at < now() THEN
    RAISE EXCEPTION 'Pair session expired';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Pair session already %', v_row.status;
  END IF;

  UPDATE public.live_pair_sessions lps
  SET status = 'confirmed',
      confirmed_at = now(),
      phone_user_agent = COALESCE(p_user_agent, lps.phone_user_agent),
      device_expires_at = now() + interval '24 hours'
  WHERE lps.id = v_row.id
  RETURNING lps.id, lps.store_id, lps.status
  INTO v_session_id, v_store_id, v_status;

  RETURN QUERY SELECT v_session_id, v_store_id, v_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_live_pair_session(text, text) TO anon, authenticated;

-- Get a confirmed paired session by token (used by phone /go-live to validate device)
CREATE OR REPLACE FUNCTION public.get_paired_session_by_token(p_token text)
RETURNS TABLE(
  session_id uuid,
  store_id uuid,
  store_owner_id uuid,
  store_name text,
  store_avatar_url text,
  status text,
  device_expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.live_pair_sessions%ROWTYPE;
  v_owner uuid;
  v_name text;
  v_avatar text;
BEGIN
  SELECT * INTO v_row FROM public.live_pair_sessions lps WHERE lps.token = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pair session not found';
  END IF;
  IF v_row.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Pair session revoked';
  END IF;
  IF v_row.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Pair session not confirmed';
  END IF;
  IF v_row.device_expires_at IS NOT NULL AND v_row.device_expires_at < now() THEN
    RAISE EXCEPTION 'Pair session expired';
  END IF;

  -- Look up store info from stores (fallback) — handle either stores or store_profiles
  BEGIN
    SELECT s.user_id, s.name, s.avatar_url
    INTO v_owner, v_name, v_avatar
    FROM public.stores s
    WHERE s.id = v_row.store_id;
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    v_owner := NULL;
  END;

  RETURN QUERY SELECT
    v_row.id,
    v_row.store_id,
    v_owner,
    v_name,
    v_avatar,
    v_row.status,
    v_row.device_expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_paired_session_by_token(text) TO anon, authenticated;

-- Revoke a paired session (called from desktop "Unpair")
CREATE OR REPLACE FUNCTION public.revoke_live_pair_session(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.live_pair_sessions
  SET revoked_at = now(),
      status = CASE WHEN status = 'confirmed' THEN 'cancelled' ELSE status END
  WHERE token = p_token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_live_pair_session(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';