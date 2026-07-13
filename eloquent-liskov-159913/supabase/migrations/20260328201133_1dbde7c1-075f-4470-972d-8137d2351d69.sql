
ALTER TABLE public.store_posts
  ADD COLUMN IF NOT EXISTS hashtags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS location text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS thumbnail_url text DEFAULT NULL;
