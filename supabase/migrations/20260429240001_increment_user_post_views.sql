-- View-count RPC for user_posts, mirroring increment_store_post_view_count.
-- Lets the TikTok-style reels viewer fire-and-forget a count bump when a
-- user reel becomes active, so the algorithmic feed has real engagement
-- signal for user-generated content.

CREATE OR REPLACE FUNCTION public.increment_user_post_view_count(p_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.user_posts
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = p_post_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_user_post_view_count(uuid) TO anon, authenticated;
