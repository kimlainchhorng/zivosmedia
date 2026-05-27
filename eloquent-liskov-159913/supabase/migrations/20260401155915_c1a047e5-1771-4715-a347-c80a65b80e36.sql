-- Public function: get follower count for a user
CREATE OR REPLACE FUNCTION public.get_follower_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.followers WHERE following_id = target_user_id;
$$;

-- Public function: get following count for a user
CREATE OR REPLACE FUNCTION public.get_following_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.followers WHERE follower_id = target_user_id;
$$;

-- Public function: get accepted friend count for a user
CREATE OR REPLACE FUNCTION public.get_friend_count(target_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer FROM public.friendships
  WHERE (user_id = target_user_id OR friend_id = target_user_id) AND status = 'accepted';
$$;

-- Function: check if current user follows target
CREATE OR REPLACE FUNCTION public.is_following(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.followers
    WHERE follower_id = auth.uid() AND following_id = target_user_id
  );
$$;

-- Function: get friendship status between current user and target
CREATE OR REPLACE FUNCTION public.get_friendship_status(target_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT
      CASE
        WHEN status = 'accepted' THEN 'friends'
        WHEN user_id = auth.uid() AND status = 'pending' THEN 'request_sent'
        WHEN friend_id = auth.uid() AND status = 'pending' THEN 'request_received'
        ELSE status
      END
    FROM public.friendships
    WHERE (user_id = auth.uid() AND friend_id = target_user_id)
       OR (user_id = target_user_id AND friend_id = auth.uid())
    LIMIT 1),
    'none'
  );
$$;