CREATE OR REPLACE FUNCTION public.create_live_pair_session(p_store_id uuid)
RETURNS TABLE(session_id uuid, token text, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_token text;
  v_expires_at timestamptz;
  v_store_name text;
  v_store_avatar text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_session_id := gen_random_uuid();
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_expires_at := now() + interval '10 minutes';

  -- Try to fetch store name/avatar (best effort)
  BEGIN
    SELECT name, avatar_url INTO v_store_name, v_store_avatar
    FROM public.stores WHERE id = p_store_id;
  EXCEPTION WHEN OTHERS THEN
    v_store_name := NULL;
    v_store_avatar := NULL;
  END;

  INSERT INTO public.live_pair_sessions (
    id, token, store_id, store_owner_id, store_name, store_avatar_url, status, expires_at
  ) VALUES (
    v_session_id, v_token, p_store_id, auth.uid(), v_store_name, v_store_avatar, 'pending', v_expires_at
  );

  RETURN QUERY SELECT v_session_id, v_token, v_expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_live_pair_session(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';