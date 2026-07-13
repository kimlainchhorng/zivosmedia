-- Drop the existing insecure view and recreate with security_invoker
DROP VIEW IF EXISTS public.profiles_public;

-- Recreate view with security_invoker=on to respect RLS from base table
CREATE VIEW public.profiles_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    user_id,
    full_name,
    avatar_url,
    status,
    created_at
  FROM public.profiles;

-- Add comment explaining the security model
COMMENT ON VIEW public.profiles_public IS 'Public-safe profile view. Uses security_invoker=on to respect RLS policies from the profiles table.';