
-- ============================================================
-- 1. PROFILES: Prevent privilege escalation on INSERT
--    Force admin_role and role to NULL for non-admin inserts
-- ============================================================
DROP POLICY IF EXISTS "zivo_profiles_insert" ON public.profiles;

CREATE POLICY "zivo_profiles_insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid() OR id = auth.uid())
  AND (
    is_admin(auth.uid())
    OR (admin_role IS NULL AND role IS NULL)
  )
);

-- ============================================================
-- 2. STORAGE: Add folder-ownership to unscoped INSERT policies
-- ============================================================

-- chat_uploads
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat_uploads'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- store-posts
DROP POLICY IF EXISTS "Authenticated users can upload post media" ON storage.objects;
CREATE POLICY "Authenticated users can upload post media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'store-posts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- order-receipts
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'order-receipts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- receipt-photos
DROP POLICY IF EXISTS "Drivers can upload receipts" ON storage.objects;
CREATE POLICY "Drivers can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipt-photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- incident_photos
DROP POLICY IF EXISTS "Drivers can upload incident photos" ON storage.objects;
CREATE POLICY "Drivers can upload incident photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'incident_photos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- ============================================================
-- 3. JOB_OTPS: Drop plaintext OTP column
-- ============================================================
ALTER TABLE public.job_otps DROP COLUMN IF EXISTS otp_plain;

-- ============================================================
-- 4. ANALYTICS_EVENTS: Fix INSERT policy to scope user_id
-- ============================================================
DROP POLICY IF EXISTS "analytics_insert_auth" ON public.analytics_events;

CREATE POLICY "analytics_insert_auth"
ON public.analytics_events
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR user_id IS NULL
);
