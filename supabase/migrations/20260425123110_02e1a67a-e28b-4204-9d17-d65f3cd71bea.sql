-- 1) Reactions RLS (table already exists)
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read story reactions" ON public.story_reactions;
CREATE POLICY "Anyone can read story reactions"
  ON public.story_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories s
      WHERE s.id = story_reactions.story_id AND s.expires_at > now()
    )
  );

DROP POLICY IF EXISTS "Users insert own story reactions" ON public.story_reactions;
CREATE POLICY "Users insert own story reactions"
  ON public.story_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own story reactions" ON public.story_reactions;
CREATE POLICY "Users update own story reactions"
  ON public.story_reactions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own story reactions" ON public.story_reactions;
CREATE POLICY "Users delete own story reactions"
  ON public.story_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- 2) Cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
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

  -- Build storage object keys from media_url + audio_url
  WITH urls AS (
    SELECT media_url AS u FROM public.stories WHERE id = ANY(expired_ids) AND media_url IS NOT NULL
    UNION ALL
    SELECT audio_url AS u FROM public.stories WHERE id = ANY(expired_ids) AND audio_url IS NOT NULL
  )
  SELECT array_agg(DISTINCT split_part(u, '/user-stories/', 2))
    INTO paths_to_remove
    FROM urls
   WHERE position('/user-stories/' in u) > 0;

  -- Remove storage rows (objects)
  IF paths_to_remove IS NOT NULL AND array_length(paths_to_remove, 1) IS NOT NULL THEN
    DELETE FROM storage.objects
     WHERE bucket_id = 'user-stories'
       AND name = ANY(paths_to_remove);
  END IF;

  -- Remove dependent rows (in case no FK cascade)
  DELETE FROM public.story_views      WHERE story_id = ANY(expired_ids);
  DELETE FROM public.story_comments   WHERE story_id = ANY(expired_ids);
  DELETE FROM public.story_reactions  WHERE story_id = ANY(expired_ids);

  -- Finally remove the stories
  DELETE FROM public.stories WHERE id = ANY(expired_ids);
  GET DIAGNOSTICS removed_count = ROW_COUNT;

  RETURN removed_count;
END;
$$;

-- 3) Cron: hourly cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stories-cleanup-hourly') THEN
    PERFORM cron.unschedule('stories-cleanup-hourly');
  END IF;
END$$;

SELECT cron.schedule(
  'stories-cleanup-hourly',
  '0 * * * *',
  $$ SELECT public.cleanup_expired_stories(); $$
);