-- Allow anonymous viewers (not signed in) to see live streams + watcher data.
-- Without this, the public /live page returns [] for guest viewers because the
-- existing RLS policy is restricted to authenticated users only.

DROP POLICY IF EXISTS "Anyone can view live streams" ON public.live_streams;
CREATE POLICY "Anyone can view live streams"
  ON public.live_streams
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view live comments" ON public.live_comments;
CREATE POLICY "Anyone can view live comments"
  ON public.live_comments
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view viewers" ON public.live_viewers;
CREATE POLICY "Anyone can view viewers"
  ON public.live_viewers
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view live likes" ON public.live_likes;
CREATE POLICY "Anyone can view live likes"
  ON public.live_likes
  FOR SELECT
  TO anon, authenticated
  USING (true);