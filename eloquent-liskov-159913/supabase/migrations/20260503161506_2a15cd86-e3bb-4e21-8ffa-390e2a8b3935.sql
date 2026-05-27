
-- 3. Restrict social/live tables to authenticated users only (no anon SELECT)
DROP POLICY IF EXISTS "Anyone can view live streams" ON public.live_streams;
CREATE POLICY "Authenticated view live streams" ON public.live_streams
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view viewers" ON public.live_viewers;
CREATE POLICY "Authenticated view viewers" ON public.live_viewers
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view live likes" ON public.live_likes;
CREATE POLICY "Authenticated view live likes" ON public.live_likes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view live comments" ON public.live_comments;
CREATE POLICY "Authenticated view live comments" ON public.live_comments
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Followers publicly readable" ON public.user_followers;
CREATE POLICY "Authenticated read followers" ON public.user_followers
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Likes publicly readable" ON public.post_likes;
CREATE POLICY "Authenticated read post likes" ON public.post_likes
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Shares publicly readable" ON public.post_shares;
CREATE POLICY "Authenticated read post shares" ON public.post_shares
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Media publicly readable" ON public.post_media;
CREATE POLICY "Authenticated read post media" ON public.post_media
FOR SELECT TO authenticated USING (true);
