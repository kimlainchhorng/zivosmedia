-- Social posts backend for customer short videos/photos
CREATE TABLE IF NOT EXISTS public.user_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'reel')),
  media_url text NOT NULL,
  caption text,
  filter_css text,
  likes_count integer NOT NULL DEFAULT 0,
  comments_count integer NOT NULL DEFAULT 0,
  views_count integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_posts_created_at ON public.user_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_posts_user_id ON public.user_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_user_posts_media_type ON public.user_posts (media_type);

ALTER TABLE public.user_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published user posts are visible" ON public.user_posts;
CREATE POLICY "Published user posts are visible"
ON public.user_posts
FOR SELECT
USING (is_published = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own user posts" ON public.user_posts;
CREATE POLICY "Users can insert own user posts"
ON public.user_posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own user posts" ON public.user_posts;
CREATE POLICY "Users can update own user posts"
ON public.user_posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own user posts" ON public.user_posts;
CREATE POLICY "Users can delete own user posts"
ON public.user_posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-posts',
  'user-posts',
  true,
  104857600,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/webm',
    'video/mp4',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read user posts media" ON storage.objects;
CREATE POLICY "Public can read user posts media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'user-posts');

DROP POLICY IF EXISTS "Users can upload own user posts media" ON storage.objects;
CREATE POLICY "Users can upload own user posts media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-posts'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own user posts media" ON storage.objects;
CREATE POLICY "Users can update own user posts media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-posts'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-posts'
  AND split_part(name, '/', 1) = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own user posts media" ON storage.objects;
CREATE POLICY "Users can delete own user posts media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-posts'
  AND split_part(name, '/', 1) = auth.uid()::text
);
