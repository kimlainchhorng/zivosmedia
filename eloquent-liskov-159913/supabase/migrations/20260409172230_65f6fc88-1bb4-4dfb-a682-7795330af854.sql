CREATE OR REPLACE FUNCTION public.is_following(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_followers
    WHERE follower_id = auth.uid() AND following_id = target_user_id
  );
$$;