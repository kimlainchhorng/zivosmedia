CREATE OR REPLACE FUNCTION public.increment_store_post_view_count(p_post_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE store_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_post_id;
$$;