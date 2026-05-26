
-- Add view_count and likes_count to store_posts for fast display
ALTER TABLE public.store_posts
  ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;

-- Post likes table
CREATE TABLE public.store_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.store_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.store_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view likes" ON public.store_post_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like posts" ON public.store_post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own" ON public.store_post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Post comments table
CREATE TABLE public.store_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.store_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.store_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.store_post_comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can add comments" ON public.store_post_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can edit own comments" ON public.store_post_comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.store_post_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to auto-update comments_count
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE store_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE store_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_comments_count
AFTER INSERT OR DELETE ON public.store_post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

-- Trigger to auto-update likes_count
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE store_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE store_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_likes_count
AFTER INSERT OR DELETE ON public.store_post_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.store_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.store_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON public.store_post_likes(user_id, post_id);
