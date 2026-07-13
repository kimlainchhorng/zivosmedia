-- Mirrors increment_store_post_view_count for the user_posts table.
-- Called by usePostViewTracking when a logged-out or logged-in user watches a user-uploaded reel.
CREATE OR REPLACE FUNCTION public.increment_user_post_view_count(p_post_id uuid)
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  UPDATE user_posts
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = p_post_id;
$$;

-- Allow the anon role to call this so anonymous viewers' watch-time is counted.
GRANT EXECUTE ON FUNCTION public.increment_user_post_view_count(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_user_post_view_count(uuid) TO authenticated;
