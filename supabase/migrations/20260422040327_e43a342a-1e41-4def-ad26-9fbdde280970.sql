DROP POLICY IF EXISTS "Store owners can upload own store-assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can update own store-assets" ON storage.objects;
DROP POLICY IF EXISTS "Store owners can delete own store-assets" ON storage.objects;

CREATE POLICY "Store owners can upload own store-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1
    FROM public.store_profiles owner_store
    WHERE owner_store.owner_id = auth.uid()
      AND owner_store.id::text = (storage.foldername((storage.objects.name)::text))[1]
  )
);

CREATE POLICY "Store owners can update own store-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1
    FROM public.store_profiles owner_store
    WHERE owner_store.owner_id = auth.uid()
      AND owner_store.id::text = (storage.foldername((storage.objects.name)::text))[1]
  )
)
WITH CHECK (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1
    FROM public.store_profiles owner_store
    WHERE owner_store.owner_id = auth.uid()
      AND owner_store.id::text = (storage.foldername((storage.objects.name)::text))[1]
  )
);

CREATE POLICY "Store owners can delete own store-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1
    FROM public.store_profiles owner_store
    WHERE owner_store.owner_id = auth.uid()
      AND owner_store.id::text = (storage.foldername((storage.objects.name)::text))[1]
  )
);