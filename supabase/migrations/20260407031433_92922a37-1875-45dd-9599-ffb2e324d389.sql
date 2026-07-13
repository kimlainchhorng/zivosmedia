
-- Fix security definer view by using security invoker
DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public
  WITH (security_invoker = true)
  AS SELECT id, full_name, avatar_url, share_code, is_verified, cover_url
  FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO anon;
