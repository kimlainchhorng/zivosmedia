CREATE OR REPLACE FUNCTION public.get_active_pair_session_for_store(p_store_id uuid)
RETURNS TABLE (
  session_id uuid,
  store_id uuid,
  store_owner_id uuid,
  store_name text,
  store_avatar_url text,
  status text,
  device_expires_at timestamptz,
  confirmed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT s.owner_id INTO v_owner FROM public.store_profiles s WHERE s.id = p_store_id;

  IF v_owner IS NULL THEN
    RETURN;
  END IF;

  IF auth.uid() IS NULL OR (auth.uid() <> v_owner AND NOT public.has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    lps.id            AS session_id,
    lps.store_id,
    v_owner           AS store_owner_id,
    s.name            AS store_name,
    s.logo_url        AS store_avatar_url,
    lps.status::text  AS status,
    lps.device_expires_at,
    lps.confirmed_at
  FROM public.live_pair_sessions lps
  JOIN public.store_profiles s ON s.id = lps.store_id
  WHERE lps.store_id = p_store_id
    AND lps.status = 'confirmed'
    AND (lps.device_expires_at IS NULL OR lps.device_expires_at > now())
  ORDER BY lps.confirmed_at DESC NULLS LAST, lps.created_at DESC
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_pair_session_for_store(uuid) TO authenticated;