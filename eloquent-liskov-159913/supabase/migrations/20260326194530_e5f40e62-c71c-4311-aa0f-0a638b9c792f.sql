DROP POLICY IF EXISTS "Authenticated users can insert store posts" ON public.store_posts;

CREATE OR REPLACE FUNCTION public.create_store_post(
  _store_id uuid,
  _caption text,
  _media_urls text[],
  _media_type text
)
RETURNS public.store_posts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_post public.store_posts;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Only admins can create store posts';
  END IF;

  IF COALESCE(array_length(_media_urls, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Add at least one picture or video';
  END IF;

  INSERT INTO public.store_posts (
    store_id,
    caption,
    media_urls,
    media_type,
    is_published
  )
  VALUES (
    _store_id,
    NULLIF(BTRIM(COALESCE(_caption, '')), ''),
    _media_urls,
    COALESCE(NULLIF(_media_type, ''), 'image'),
    true
  )
  RETURNING * INTO new_post;

  RETURN new_post;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_store_post(uuid, text, text[], text) TO authenticated;