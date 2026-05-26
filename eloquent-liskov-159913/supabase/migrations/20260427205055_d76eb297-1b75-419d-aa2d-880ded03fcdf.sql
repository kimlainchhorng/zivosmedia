-- Phase 10A: Lock down channel-media bucket listing.
-- The bucket is public so individual files remain readable via the CDN public URL
-- (Supabase serves public buckets through /object/public/ which bypasses RLS).
-- We only want to block anonymous *enumeration/listing* of every object key.
-- Solution: restrict the SELECT policy to authenticated users. Public CDN URLs
-- still resolve for everyone; only the LIST API is gated.

DROP POLICY IF EXISTS "channel-media public read" ON storage.objects;

CREATE POLICY "channel-media authenticated read"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'channel-media');