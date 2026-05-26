-- 1. CHAT-ATTACHMENTS: Replace public SELECT with authenticated + chat member check
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
CREATE POLICY "Chat members can view attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND EXISTS (SELECT 1 FROM chat_members cm WHERE cm.user_id = auth.uid())
  );

-- 2. CHAT_UPLOADS: Scope SELECT to uploader's own folder
DROP POLICY IF EXISTS "Authenticated users can view chat images" ON storage.objects;
CREATE POLICY "Users can view own chat uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat_uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 3. INCIDENT_PHOTOS: Scope SELECT to uploader + admins
DROP POLICY IF EXISTS "Authenticated users can view incident photos" ON storage.objects;
CREATE POLICY "Incident photo owners and admins can view" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'incident_photos'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY(ARRAY['admin'::app_role, 'support'::app_role, 'operations'::app_role]))
    )
  );

-- 4. ORDER-RECEIPTS: Replace public SELECT with authenticated + owner scope
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
CREATE POLICY "Receipt owners and admins can view" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-receipts'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY(ARRAY['admin'::app_role, 'support'::app_role]))
    )
  );

-- 5. RECEIPT-PHOTOS: Replace public SELECT with authenticated + owner scope
DROP POLICY IF EXISTS "Public can view receipts" ON storage.objects;
CREATE POLICY "Receipt photo owners and admins can view" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipt-photos'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = ANY(ARRAY['admin'::app_role, 'support'::app_role]))
    )
  );

-- 6. CLAIM-DOCUMENTS: Scope INSERT to claim reporter
DROP POLICY IF EXISTS "Authenticated users can upload claim documents" ON storage.objects;
CREATE POLICY "Claim reporters can upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'claim-documents'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM insurance_claims ic
      WHERE ic.reporter_user_id = auth.uid()
      AND (ic.id)::text = (storage.foldername(name))[1]
    )
  );