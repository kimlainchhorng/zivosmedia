DROP POLICY IF EXISTS "Store owners can upload own store-assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can update own store-assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can delete own store-assets" ON storage.objects;

CREATE POLICY "Store owners can upload own store-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND auth.uid() IN (
    SELECT sp.owner_id
    FROM public.store_profiles sp
    WHERE sp.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Store owners can update own store-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND auth.uid() IN (
    SELECT sp.owner_id
    FROM public.store_profiles sp
    WHERE sp.id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'store-assets'
  AND auth.uid() IN (
    SELECT sp.owner_id
    FROM public.store_profiles sp
    WHERE sp.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Store owners can delete own store-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND auth.uid() IN (
    SELECT sp.owner_id
    FROM public.store_profiles sp
    WHERE sp.id::text = (storage.foldername(name))[1]
  )
);