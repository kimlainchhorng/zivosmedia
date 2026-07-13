
-- User Stories (24-hour ephemeral status updates)
CREATE TABLE public.user_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  caption TEXT,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view non-expired stories
CREATE POLICY "Anyone can view active stories"
  ON public.user_stories FOR SELECT
  TO authenticated
  USING (expires_at > now());

-- Users can insert their own stories
CREATE POLICY "Users can create own stories"
  ON public.user_stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own stories
CREATE POLICY "Users can delete own stories"
  ON public.user_stories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for story media
INSERT INTO storage.buckets (id, name, public) VALUES ('user-stories', 'user-stories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Auth users can upload stories" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-stories' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view story media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'user-stories');

CREATE POLICY "Users can delete own story media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'user-stories' AND (storage.foldername(name))[1] = auth.uid()::text);
