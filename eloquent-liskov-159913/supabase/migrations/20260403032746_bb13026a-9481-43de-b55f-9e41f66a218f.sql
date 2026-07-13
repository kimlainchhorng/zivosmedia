
ALTER TABLE public.user_posts
  ADD COLUMN shared_from_post_id text DEFAULT NULL,
  ADD COLUMN shared_from_user_id uuid DEFAULT NULL;
