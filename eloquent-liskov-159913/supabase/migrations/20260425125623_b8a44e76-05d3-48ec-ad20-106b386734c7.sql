-- Harden cleanup_expired_stories: also sweep any storage objects under
-- user_id/story_id/* prefix so failed uploads or non-public URLs don't leak.

CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  expired_rows record;
  expired_ids uuid[];
  paths_to_remove text[];
  removed_count integer := 0;
BEGIN
  SELECT array_agg(id) INTO expired_ids
  FROM public.stories
  WHERE expires_at < now();

  IF expired_ids IS NULL OR array_length(expired_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- 1) Sweep by recovered URL key (legacy path)
  WITH urls AS (
    SELECT media_url AS u FROM public.stories WHERE id = ANY(expired_ids) AND media_url IS NOT NULL
    UNION ALL
    SELECT audio_url AS u FROM public.stories WHERE id = ANY(expired_ids) AND audio_url IS NOT NULL
  )
  SELECT array_agg(DISTINCT split_part(u, '/user-stories/', 2))
    INTO paths_to_remove
    FROM urls
   WHERE position('/user-stories/' in u) > 0;

  IF paths_to_remove IS NOT NULL AND array_length(paths_to_remove, 1) IS NOT NULL THEN
    DELETE FROM storage.objects
     WHERE bucket_id = 'user-stories'
       AND name = ANY(paths_to_remove);
  END IF;

  -- 2) Belt-and-suspenders: sweep by user_id/story_id/* prefix so any
  --    orphaned uploads (failed inserts, missing url columns, alt names)
  --    are also removed.
  FOR expired_rows IN
    SELECT id, user_id FROM public.stories WHERE id = ANY(expired_ids)
  LOOP
    DELETE FROM storage.objects
     WHERE bucket_id = 'user-stories'
       AND name LIKE expired_rows.user_id::text || '/' || expired_rows.id::text || '/%';
  END LOOP;

  -- Remove dependent rows
  DELETE FROM public.story_views      WHERE story_id = ANY(expired_ids);
  DELETE FROM public.story_comments   WHERE story_id = ANY(expired_ids);
  DELETE FROM public.story_reactions  WHERE story_id = ANY(expired_ids);

  DELETE FROM public.stories WHERE id = ANY(expired_ids);
  GET DIAGNOSTICS removed_count = ROW_COUNT;

  RETURN removed_count;
END;
$$;