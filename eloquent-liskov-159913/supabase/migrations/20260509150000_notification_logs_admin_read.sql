-- ============================================================================
-- Admin read access for notification log tables
-- ----------------------------------------------------------------------------
-- The /admin/notifications/analytics dashboard reads from three log tables.
-- They were originally created with self-only RLS (each user sees their own
-- rows), so admins get an empty dashboard. Add a parallel admin-read policy
-- on each table.
--
-- We use the existing public.is_admin(user_uuid) helper (created in
-- 20260131202033) so the rule auto-tracks the canonical admin definition.
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'push_notification_logs' AND relnamespace = 'public'::regnamespace) THEN
    DROP POLICY IF EXISTS "Admins can view all push logs" ON public.push_notification_logs;
    CREATE POLICY "Admins can view all push logs"
      ON public.push_notification_logs FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'email_send_log' AND relnamespace = 'public'::regnamespace) THEN
    DROP POLICY IF EXISTS "Admins can view all email logs" ON public.email_send_log;
    CREATE POLICY "Admins can view all email logs"
      ON public.email_send_log FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'sms_send_log' AND relnamespace = 'public'::regnamespace) THEN
    DROP POLICY IF EXISTS "Admins can view all sms logs" ON public.sms_send_log;
    CREATE POLICY "Admins can view all sms logs"
      ON public.sms_send_log FOR SELECT
      USING (public.is_admin(auth.uid()));
  END IF;
END $$;
