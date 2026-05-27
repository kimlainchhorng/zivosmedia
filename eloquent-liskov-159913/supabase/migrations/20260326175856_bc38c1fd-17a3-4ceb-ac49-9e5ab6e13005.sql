-- Store social posts (pictures and videos)
CREATE TABLE public.store_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  caption TEXT,
  media_urls TEXT[] NOT NULL DEFAULT '{}',
  media_type TEXT NOT NULL DEFAULT 'image',
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_posts ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access to store posts"
ON public.store_posts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
  )
);

-- Public can view published posts
CREATE POLICY "Public can view published store posts"
ON public.store_posts
FOR SELECT
TO anon
USING (is_published = true);

-- Authenticated users can view published posts
CREATE POLICY "Authenticated can view published store posts"
ON public.store_posts
FOR SELECT
TO authenticated
USING (is_published = true);

-- Storage bucket for post media
INSERT INTO storage.buckets (id, name, public)
VALUES ('store-posts', 'store-posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload post media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'store-posts');

CREATE POLICY "Anyone can view post media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'store-posts');

CREATE POLICY "Authenticated users can delete post media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'store-posts');