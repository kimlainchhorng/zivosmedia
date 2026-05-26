-- 1. PROFILES: Prevent privilege escalation
DROP POLICY IF EXISTS "zivo_profiles_update" ON public.profiles;
CREATE POLICY "zivo_profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) OR (id = auth.uid()) OR is_admin(auth.uid()))
  WITH CHECK (
    CASE
      WHEN is_admin(auth.uid()) THEN true
      ELSE (
        (role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = profiles.id))
        AND (admin_role IS NOT DISTINCT FROM (SELECT p.admin_role FROM public.profiles p WHERE p.id = profiles.id))
      )
    END
  );

-- 2. REALTIME: Remove broad policies
DROP POLICY IF EXISTS "realtime_read_private" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_read_table_topics" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_write_scoped" ON realtime.messages;

-- 3. SMS OTP: Remove client-readable OTP
DROP POLICY IF EXISTS "Users can view own OTP codes" ON public.sms_otp_codes;

-- 4. ABANDONED_SEARCHES: Restrict INSERT email
DROP POLICY IF EXISTS "abandoned_insert_auth" ON public.abandoned_searches;
CREATE POLICY "abandoned_insert_own_email" ON public.abandoned_searches
  FOR INSERT TO authenticated
  WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 5. ANOMALY_LOGS: Remove user DELETE/INSERT
DROP POLICY IF EXISTS "Users can delete their own anomaly logs" ON public.anomaly_logs;
DROP POLICY IF EXISTS "Users can create their own anomaly logs" ON public.anomaly_logs;
CREATE POLICY "Admins can manage anomaly logs" ON public.anomaly_logs
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- 6. PARTNER_PORTAL: Use user_roles
DROP POLICY IF EXISTS "Admins can manage portal applications" ON public.partner_portal_applications;
CREATE POLICY "Admins can manage portal applications" ON public.partner_portal_applications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 7. STORAGE: Fix delivery-proofs (r.name -> r.id)
DROP POLICY IF EXISTS "Authorized read for delivery proofs" ON storage.objects;
CREATE POLICY "Authorized read for delivery proofs" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'delivery-proofs' AND (
      EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM food_orders fo JOIN drivers d ON d.id = fo.driver_id WHERE d.user_id = auth.uid() AND (fo.id)::text = (storage.foldername(objects.name))[1])
      OR EXISTS (SELECT 1 FROM food_orders fo JOIN restaurants r ON r.id = fo.restaurant_id WHERE r.owner_id = auth.uid() AND (fo.id)::text = (storage.foldername(objects.name))[1])
    )
  );

-- 8. STORAGE: Restrict chat-attachments to chat members
DROP POLICY IF EXISTS "Chat participants can upload attachments" ON storage.objects;
CREATE POLICY "Chat participants can upload attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments' AND auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM chat_members cm WHERE cm.user_id = auth.uid())
  );