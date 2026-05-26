DROP POLICY IF EXISTS "channel-media authenticated read" ON storage.objects;

CREATE POLICY "channel-media owner read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'channel-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);