-- Fix broken store_posts record: update media_urls to point to actual existing file
UPDATE store_posts 
SET media_urls = ARRAY['https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-posts/posts/1dd04bf0-9ffd-4155-9fe8-f582881b1ead/1774556579080.mp4']
WHERE id = 'e04b9825-a4bb-4958-991b-71ef37948ad4';