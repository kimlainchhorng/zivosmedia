ALTER TABLE public.user_posts
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';