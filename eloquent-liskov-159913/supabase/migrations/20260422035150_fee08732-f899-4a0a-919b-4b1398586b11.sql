-- Allow store owners to manage objects in the store-assets bucket
-- when the first folder of the path matches a store they own.

CREATE POLICY "Store owners can upload own store-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.store_profiles sp
    WHERE sp.id::text = (storage.foldername(name))[1]
      AND sp.owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners can update own store-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.store_profiles sp
    WHERE sp.id::text = (storage.foldername(name))[1]
      AND sp.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.store_profiles sp
    WHERE sp.id::text = (storage.foldername(name))[1]
      AND sp.owner_id = auth.uid()
  )
);

CREATE POLICY "Store owners can delete own store-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.store_profiles sp
    WHERE sp.id::text = (storage.foldername(name))[1]
      AND sp.owner_id = auth.uid()
  )
);