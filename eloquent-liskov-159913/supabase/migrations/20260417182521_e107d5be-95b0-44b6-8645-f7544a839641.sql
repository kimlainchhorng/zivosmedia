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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_session_id := gen_random_uuid();
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_expires_at := now() + interval '10 minutes';

  INSERT INTO public.live_pair_sessions (
    id,
    token,
    store_id,
    created_by,
    status,
    expires_at
  )
  VALUES (
    v_session_id,
    v_token,
    p_store_id,
    auth.uid(),
    'pending',
    v_expires_at
  );

  RETURN QUERY
  SELECT v_session_id, v_token, v_expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_live_pair_session(uuid) TO authenticated;