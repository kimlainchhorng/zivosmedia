-- Patch live-pair RPCs to read from store_profiles (name, logo_url, owner_id)

CREATE OR REPLACE FUNCTION public.create_live_pair_session(p_store_id uuid)
 RETURNS TABLE(session_id uuid, token text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_session_id uuid;
  v_token text;
  v_expires_at timestamptz;
  v_store_name text;
  v_store_avatar text;
  v_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_session_id := gen_random_uuid();
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_expires_at := now() + interval '10 minutes';

  SELECT sp.name, sp.logo_url, sp.owner_id
    INTO v_store_name, v_store_avatar, v_owner
  FROM public.store_profiles sp WHERE sp.id = p_store_id;

  INSERT INTO public.live_pair_sessions (
    id, token, store_id, store_owner_id, store_name, store_avatar_url, status, expires_at
  ) VALUES (
    v_session_id, v_token, p_store_id, COALESCE(v_owner, auth.uid()),
    v_store_name, v_store_avatar, 'pending', v_expires_at
  );

  RETURN QUERY SELECT v_session_id, v_token, v_expires_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_paired_session_by_token(p_token text)
 RETURNS TABLE(session_id uuid, store_id uuid, store_owner_id uuid, store_name text, store_avatar_url text, status text, device_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT sp.owner_id, sp.name, sp.logo_url
    INTO v_owner, v_name, v_avatar
  FROM public.store_profiles sp WHERE sp.id = v_row.store_id;

  RETURN QUERY SELECT
    v_row.id,
    v_row.store_id,
    COALESCE(v_owner, v_row.store_owner_id),
    COALESCE(v_name, v_row.store_name),
    COALESCE(v_avatar, v_row.store_avatar_url),
    v_row.status,
    v_row.device_expires_at;
END;
$function$;

-- Backfill existing rows that are missing name/avatar
UPDATE public.live_pair_sessions lps
SET store_name = sp.name,
    store_avatar_url = sp.logo_url,
    store_owner_id = COALESCE(lps.store_owner_id, sp.owner_id)
FROM public.store_profiles sp
WHERE sp.id = lps.store_id
  AND (lps.store_name IS NULL OR lps.store_avatar_url IS NULL);

NOTIFY pgrst, 'reload schema';