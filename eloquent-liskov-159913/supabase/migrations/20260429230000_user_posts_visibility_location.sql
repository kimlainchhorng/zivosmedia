-- Add visibility + location columns to user_posts so the CreatePostModal can
-- persist the audience picker and location tag (previously discarded by the
-- API).

ALTER TABLE public.user_posts
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS location text;

-- Constrain visibility to the three values the UI exposes.
ALTER TABLE public.user_posts
  DROP CONSTRAINT IF EXISTS user_posts_visibility_check;
ALTER TABLE public.user_posts
  ADD CONSTRAINT user_posts_visibility_check
  CHECK (visibility IN ('everyone', 'friends', 'onlyme'));

CREATE INDEX IF NOT EXISTS idx_user_posts_visibility ON public.user_posts(visibility);

-- Replace the permissive "anyone can view published" policy with a
-- visibility-aware one:
--   * everyone   → public, like before
--   * friends    → author or any user the author has chosen to follow back
--                  (i.e. mutual follow / followers, depending on product —
--                  here we use "followers of the author" which matches the
--                  modal copy "Friends")
--   * onlyme     → author only
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.user_posts;

CREATE POLICY "View posts by visibility"
  ON public.user_posts FOR SELECT
  USING (
    is_published = true
    AND (
      visibility = 'everyone'
      OR auth.uid() = user_id
      OR (
        visibility = 'friends'
        AND auth.uid() IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.user_followers
          WHERE follower_id = auth.uid()
            AND following_id = user_posts.user_id
        )
      )
    )
  );
