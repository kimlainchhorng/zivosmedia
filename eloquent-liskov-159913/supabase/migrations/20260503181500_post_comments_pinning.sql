-- Add is_pinned to the unified post_comments table and the unified RPC
-- the frontend calls. The earlier comment-pinning migration only handled
-- the legacy store_post_comments / user_post_comments tables (now merged).

ALTER TABLE public.post_comments
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_post_comments_one_pin_per_post
  ON public.post_comments (post_id, post_source)
  WHERE is_pinned;

CREATE OR REPLACE FUNCTION public.toggle_unified_comment_pin(
  _comment_id uuid
) RETURNS TABLE(pinned boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_post_id     text;
  v_post_source text;
  v_was         boolean;
  v_authorized  boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT c.post_id, c.post_source, c.is_pinned
    INTO v_post_id, v_post_source, v_was
    FROM public.post_comments c
   WHERE c.id = _comment_id;

  IF v_post_id IS NULL THEN
    RAISE EXCEPTION 'comment not found';
  END IF;

  IF v_post_source = 'user' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_posts up
       WHERE up.id::text = regexp_replace(v_post_id, '^u-', '')
         AND up.user_id = v_uid
    ) INTO v_authorized;
  ELSIF v_post_source = 'store' THEN
    SELECT EXISTS (
      SELECT 1
        FROM public.store_posts sp
        JOIN public.store_profiles spr ON spr.id = sp.store_id
       WHERE sp.id::text = regexp_replace(v_post_id, '^s-', '')
         AND spr.owner_id = v_uid
    ) INTO v_authorized;
  END IF;

  IF NOT v_authorized THEN
    RAISE EXCEPTION 'only the post author can pin comments';
  END IF;

  UPDATE public.post_comments
     SET is_pinned = false
   WHERE post_id = v_post_id
     AND post_source = v_post_source
     AND is_pinned;

  IF NOT v_was THEN
    UPDATE public.post_comments SET is_pinned = true WHERE id = _comment_id;
    RETURN QUERY SELECT true;
  ELSE
    RETURN QUERY SELECT false;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_unified_comment_pin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.toggle_unified_comment_pin(uuid) TO authenticated;
