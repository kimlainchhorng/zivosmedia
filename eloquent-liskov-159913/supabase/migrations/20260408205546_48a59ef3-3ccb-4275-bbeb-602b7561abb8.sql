
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-posts', 'user-posts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view user post media"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-posts');

CREATE POLICY "Authenticated users can upload their own post media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own post media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'user-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own post media"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-posts' AND auth.uid()::text = (storage.foldername(name))[1]);
