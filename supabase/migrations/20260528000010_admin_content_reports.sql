-- Admin policies on content_reports so the moderation queue can read pending
-- reports and resolve them. Reporters still see only their own rows (existing
-- policies untouched).

DROP POLICY IF EXISTS "content_reports_admin_read" ON public.content_reports;
CREATE POLICY "content_reports_admin_read" ON public.content_reports
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "content_reports_admin_update" ON public.content_reports;
CREATE POLICY "content_reports_admin_update" ON public.content_reports
  FOR UPDATE USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
