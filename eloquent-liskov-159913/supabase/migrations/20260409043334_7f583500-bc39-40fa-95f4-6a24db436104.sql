
-- Add media_urls array column
ALTER TABLE public.user_posts ADD COLUMN media_urls text[] DEFAULT '{}';

-- Backfill existing posts
UPDATE public.user_posts
SET media_urls = ARRAY[media_url]
WHERE media_url IS NOT NULL AND media_url != '';
