CREATE POLICY "Admins can upload to any user post folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-posts'
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Super admins can upload to any user post folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-posts'
  AND public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Support can upload to any user post folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'user-posts'
  AND public.has_role(auth.uid(), 'support')
);