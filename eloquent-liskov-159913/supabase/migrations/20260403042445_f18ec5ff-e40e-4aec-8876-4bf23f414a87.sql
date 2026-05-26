ALTER TABLE public.user_posts ADD COLUMN IF NOT EXISTS shares_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.store_posts ADD COLUMN IF NOT EXISTS shares_count integer NOT NULL DEFAULT 0;