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
      phone_user_agent = COALESCE(p_user_agent, lps.phone_user_agent)
  WHERE lps.id = v_row.id
  RETURNING lps.id, lps.store_id, lps.status
  INTO v_session_id, v_store_id, v_status;

  RETURN QUERY SELECT v_session_id, v_store_id, v_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_live_pair_session(text, text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';