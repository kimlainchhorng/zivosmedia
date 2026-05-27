-- 1) Move existing storage rows from products/<storeId>/... to <storeId>/products/...
UPDATE storage.objects
SET name = regexp_replace(name, '^products/([^/]+)/(.*)$', '\1/products/\2')
WHERE bucket_id = 'store-assets'
  AND name ~ '^products/[^/]+/.+$';

-- 2) Rewrite single image_url values
UPDATE public.store_products sp
SET image_url = replace(
  sp.image_url,
  '/store-assets/products/' || sp.store_id::text || '/',
  '/store-assets/' || sp.store_id::text || '/products/'
)
WHERE sp.image_url LIKE '%/store-assets/products/' || sp.store_id::text || '/%';

-- 3) Rewrite image_urls jsonb arrays element-by-element
UPDATE public.store_products sp
SET image_urls = (
  SELECT jsonb_agg(
    to_jsonb(
      replace(
        url_elem #>> '{}',
        '/store-assets/products/' || sp.store_id::text || '/',
        '/store-assets/' || sp.store_id::text || '/products/'
      )
    )
  )
  FROM jsonb_array_elements(sp.image_urls) AS url_elem
)
WHERE sp.image_urls IS NOT NULL
  AND sp.image_urls::text LIKE '%/store-assets/products/' || sp.store_id::text || '/%';
