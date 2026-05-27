
-- Fix: store-posts DELETE policy — add ownership check
DROP POLICY IF EXISTS "Allow delete store posts" ON storage.objects;
CREATE POLICY "Allow delete store posts" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'store-posts'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Fix: chat-media-files INSERT policy — add path ownership
DROP POLICY IF EXISTS "Allow upload chat media" ON storage.objects;
CREATE POLICY "Allow upload chat media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media-files'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- Fix: incident-attachments INSERT policy — restrict to admin roles
DROP POLICY IF EXISTS "Admin can upload incident attachments" ON storage.objects;
CREATE POLICY "Admin can upload incident attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'incident-attachments'
    AND public.has_role(auth.uid(), 'admin')
  );
