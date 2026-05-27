
-- 1. Fix profiles 'friends' visibility to require actual friendship
DROP POLICY IF EXISTS "Authenticated read visible profiles" ON public.profiles;

CREATE POLICY "Authenticated read visible profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR COALESCE(profile_visibility, 'public') = 'public'
  OR (
    COALESCE(profile_visibility, 'public') = 'friends'
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (
          (f.user_id = auth.uid() AND f.friend_id = profiles.id)
          OR (f.friend_id = auth.uid() AND f.user_id = profiles.id)
        )
    )
  )
);

-- 2. Restrict live_stream_signals: authenticated only; insert must be host or active viewer
DROP POLICY IF EXISTS "Anyone can insert signals for a known stream" ON public.live_stream_signals;
DROP POLICY IF EXISTS "Anyone can read signals for a known stream" ON public.live_stream_signals;

CREATE POLICY "Authenticated read signals for joined stream"
ON public.live_stream_signals
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_streams s
    WHERE s.id = live_stream_signals.stream_id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.live_viewers v
    WHERE v.stream_id = live_stream_signals.stream_id
      AND v.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated insert signals as host or viewer"
ON public.live_stream_signals
FOR INSERT
TO authenticated
WITH CHECK (
  stream_id IS NOT NULL
  AND (
    EXISTS (
      SELECT 1 FROM public.live_streams s
      WHERE s.id = live_stream_signals.stream_id
        AND s.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.live_viewers v
      WHERE v.stream_id = live_stream_signals.stream_id
        AND v.user_id = auth.uid()
    )
  )
);
