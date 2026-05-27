-- Create user_posts table for profile social posts (photos & reels)
CREATE TABLE IF NOT EXISTS public.user_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'photo',
  media_url text NOT NULL,
  caption text,
  filter_css text,
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  views_count integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.user_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view published posts
CREATE POLICY "Anyone can view published posts"
  ON public.user_posts FOR SELECT
  USING (is_published = true);

-- Users can insert their own posts
CREATE POLICY "Users can insert own posts"
  ON public.user_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts"
  ON public.user_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON public.user_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create user-posts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-posts', 'user-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can view
CREATE POLICY "Public read user-posts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-posts');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users upload own user-posts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'user-posts' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own uploads
CREATE POLICY "Users delete own user-posts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'user-posts' AND (storage.foldername(name))[1] = auth.uid()::text);