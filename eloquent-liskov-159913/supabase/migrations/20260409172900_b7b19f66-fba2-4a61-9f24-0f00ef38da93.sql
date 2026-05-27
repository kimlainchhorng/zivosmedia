-- Fix get_follower_count
CREATE OR REPLACE FUNCTION public.get_follower_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.user_followers WHERE following_id = target_user_id;
$$;

-- Fix get_following_count
CREATE OR REPLACE FUNCTION public.get_following_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.user_followers WHERE follower_id = target_user_id;
$$;

-- Migrate legacy data from followers to user_followers
INSERT INTO public.user_followers (follower_id, following_id, created_at)
SELECT follower_id, following_id, created_at FROM public.followers
ON CONFLICT DO NOTHING;

-- Drop the old table
DROP TABLE IF EXISTS public.followers;