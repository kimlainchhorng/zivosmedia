
-- Create an unambiguous function for frontend RPC calls
-- This avoids the PostgREST overload ambiguity while keeping
-- the existing has_role(uuid, text) for RLS policies intact.
CREATE OR REPLACE FUNCTION public.check_user_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role::app_role
  )
$$;
