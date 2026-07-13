-- Make chat_uploads bucket public
UPDATE storage.buckets SET public = true WHERE id = 'chat_uploads';

-- Only create the view policy if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view chat images' AND tablename = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Anyone can view chat images" ON storage.objects FOR SELECT USING (bucket_id = ''chat_uploads'')';
  END IF;
END $$;
