
-- ============================================================
-- 1. Remove overly broad "Only safe image uploads" policy
--    Per-bucket policies already enforce access correctly
-- ============================================================
DROP POLICY IF EXISTS "Only safe image uploads" ON storage.objects;

-- ============================================================
-- 2. Fix chat-attachments: scope to specific chat membership
-- ============================================================
DROP POLICY IF EXISTS "Chat members can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Chat participants can upload attachments" ON storage.objects;

CREATE POLICY "Chat members can view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND EXISTS (
    SELECT 1 FROM chat_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.chat_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Chat participants can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM chat_members cm
    WHERE cm.user_id = auth.uid()
      AND cm.chat_id::text = (storage.foldername(name))[1]
  )
);

-- ============================================================
-- 3. vehicle_stats: Restrict to owners + admins
-- ============================================================
DROP POLICY IF EXISTS "Public can view vehicle stats" ON public.vehicle_stats;

CREATE POLICY "Owners and admins can view vehicle stats"
ON public.vehicle_stats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM p2p_vehicles v
    WHERE v.id = vehicle_stats.vehicle_id
      AND v.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
