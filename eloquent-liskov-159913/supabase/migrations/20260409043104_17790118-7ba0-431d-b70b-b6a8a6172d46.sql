
CREATE POLICY "Users can upload own story media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-stories'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own story media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-stories'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
