-- Force bucket visibility by ensuring it exists with correct settings
UPDATE storage.buckets SET public = true WHERE id = 'user-posts';

-- Drop and recreate duplicate policies to force schema refresh
DROP POLICY IF EXISTS "Public read user-posts" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own user-posts" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own user-posts" ON storage.objects;
