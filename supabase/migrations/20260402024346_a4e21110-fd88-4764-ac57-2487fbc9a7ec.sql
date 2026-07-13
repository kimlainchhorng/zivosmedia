-- Create covers storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);

-- Public read access for covers
CREATE POLICY "Anyone can view covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'covers');

-- Users can upload their own cover
CREATE POLICY "Users can upload their own cover"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own cover
CREATE POLICY "Users can update their own cover"
ON storage.objects FOR UPDATE
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own cover
CREATE POLICY "Users can delete their own cover"
ON storage.objects FOR DELETE
USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);