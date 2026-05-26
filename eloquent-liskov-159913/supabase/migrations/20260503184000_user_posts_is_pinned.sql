-- The feed query (ReelsFeedPage) selects user_posts.is_pinned to render
-- pinned posts at the top. Without the column the entire user_posts query
-- errors out and only store posts render. Add the column with a partial
-- unique index allowing one pin per user.
ALTER TABLE public.user_posts
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_posts_one_pin_per_user
  ON public.user_posts (user_id)
  WHERE is_pinned;
