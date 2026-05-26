-- Repair product images broken by the 2026-04-22 direct storage.objects rename.
--
-- Supabase Storage object bytes are addressed by the storage object key. The
-- earlier migration rewrote metadata rows from:
--   products/<store_id>/<file>
-- to:
--   <store_id>/products/<file>
-- without moving the underlying object bytes through the Storage API. For
-- product images uploaded before that migration, the public URLs now point at
-- metadata keys whose backing object cannot be found. Restore only those older
-- product objects to their original metadata path, then rewrite matching
-- store_products URLs back to the legacy path.

DO $$
DECLARE
  bad_rename_cutoff timestamptz := '2026-04-22 03:56:09+00';
BEGIN
  WITH candidates AS (
    SELECT
      o.id,
      o.bucket_id,
      o.name AS current_name,
      regexp_replace(o.name, '^([0-9a-f-]{36})/products/(.+)$', 'products/\1/\2') AS legacy_name
    FROM storage.objects o
    WHERE o.bucket_id = 'store-assets'
      AND o.name ~ '^[0-9a-f-]{36}/products/.+$'
      AND o.created_at < bad_rename_cutoff
  )
  UPDATE storage.objects o
  SET name = c.legacy_name
  FROM candidates c
  WHERE o.id = c.id
    AND NOT EXISTS (
      SELECT 1
      FROM storage.objects existing
      WHERE existing.bucket_id = c.bucket_id
        AND existing.name = c.legacy_name
        AND existing.id <> c.id
    );
END $$;

UPDATE public.store_products sp
SET image_url = replace(
  sp.image_url,
  '/store-assets/' || sp.store_id::text || '/products/',
  '/store-assets/products/' || sp.store_id::text || '/'
)
WHERE sp.created_at < '2026-04-22 03:56:09+00'
  AND sp.image_url LIKE '%/store-assets/' || sp.store_id::text || '/products/%'
  AND EXISTS (
    SELECT 1
    FROM storage.objects o
    WHERE o.bucket_id = 'store-assets'
      AND o.name = 'products/' || sp.store_id::text || '/' || regexp_replace(sp.image_url, '^.*/products/', '')
  );

UPDATE public.store_products sp
SET image_urls = (
  SELECT jsonb_agg(
    CASE
      WHEN url_text LIKE '%/store-assets/' || sp.store_id::text || '/products/%'
        AND EXISTS (
          SELECT 1
          FROM storage.objects o
          WHERE o.bucket_id = 'store-assets'
            AND o.name = 'products/' || sp.store_id::text || '/' || regexp_replace(url_text, '^.*/products/', '')
        )
      THEN to_jsonb(replace(
        url_text,
        '/store-assets/' || sp.store_id::text || '/products/',
        '/store-assets/products/' || sp.store_id::text || '/'
      ))
      ELSE to_jsonb(url_text)
    END
  )
  FROM jsonb_array_elements_text(sp.image_urls) AS url_elem(url_text)
)
WHERE sp.created_at < '2026-04-22 03:56:09+00'
  AND sp.image_urls IS NOT NULL
  AND jsonb_typeof(sp.image_urls) = 'array'
  AND sp.image_urls::text LIKE '%/store-assets/' || sp.store_id::text || '/products/%';

-- Keep old and new product asset folders manageable by store owners. New
-- uploads continue to use <store_id>/products/<file>, while repaired legacy
-- product objects may live at products/<store_id>/<file>.
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
      AND owner_store.id::text = CASE
        WHEN (storage.foldername((storage.objects.name)::text))[1] = 'products'
          THEN (storage.foldername((storage.objects.name)::text))[2]
        ELSE (storage.foldername((storage.objects.name)::text))[1]
      END
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
      AND owner_store.id::text = CASE
        WHEN (storage.foldername((storage.objects.name)::text))[1] = 'products'
          THEN (storage.foldername((storage.objects.name)::text))[2]
        ELSE (storage.foldername((storage.objects.name)::text))[1]
      END
  )
)
WITH CHECK (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1
    FROM public.store_profiles owner_store
    WHERE owner_store.owner_id = auth.uid()
      AND owner_store.id::text = CASE
        WHEN (storage.foldername((storage.objects.name)::text))[1] = 'products'
          THEN (storage.foldername((storage.objects.name)::text))[2]
        ELSE (storage.foldername((storage.objects.name)::text))[1]
      END
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
      AND owner_store.id::text = CASE
        WHEN (storage.foldername((storage.objects.name)::text))[1] = 'products'
          THEN (storage.foldername((storage.objects.name)::text))[2]
        ELSE (storage.foldername((storage.objects.name)::text))[1]
      END
  )
);
