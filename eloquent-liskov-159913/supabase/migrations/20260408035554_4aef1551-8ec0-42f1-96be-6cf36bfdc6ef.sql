
CREATE OR REPLACE FUNCTION public.admin_lookup_profile_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(user_id, id)
  FROM public.profiles
  WHERE email = _email
  LIMIT 1;
$$;

-- Only allow authenticated users (admin check done via RPC caller context)
REVOKE ALL ON FUNCTION public.admin_lookup_profile_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_lookup_profile_by_email(text) TO authenticated;
