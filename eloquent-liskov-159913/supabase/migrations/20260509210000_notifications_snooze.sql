-- ============================================================================
-- Notification snooze
-- ----------------------------------------------------------------------------
-- Adds a `snoozed_until` column to public.notifications. The frontend
-- filters out rows where snoozed_until > now() so they hide from the
-- inbox until that time, then resurface (the realtime UPDATE listener in
-- useNotifications picks up the change automatically when the snooze
-- expires — see the unsnooze cron at the bottom).
--
-- An hourly pg_cron task re-emits a fresh push for the user when their
-- snooze expires, so the bell pulses again. We reuse send-push-notification
-- with a small batch of expiring rows to avoid per-row HTTP overhead.
-- ============================================================================

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_snoozed_until
  ON public.notifications(user_id, snoozed_until)
  WHERE snoozed_until IS NOT NULL;

COMMENT ON COLUMN public.notifications.snoozed_until IS
  'When set in the future, the inbox UI hides this row. When the time
   passes, the unsnooze cron clears it and re-emits a push so the user
   gets a fresh buzz.';

-- ---------------------------------------------------------------------------
-- Unsnooze cron — every 5 minutes, find rows whose snooze just expired,
-- clear the column, and fire a single batch push per user with the title
-- of their oldest snooze-expired row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tick_unsnooze_notifications()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_url   TEXT;
  v_key   TEXT;
  v_count INTEGER := 0;
  v_rows  RECORD;
BEGIN
  v_url := COALESCE(current_setting('app.settings.supabase_url', true), 'https://slirphzzwcogdbkeicff.supabase.co');
  v_key := COALESCE(current_setting('app.settings.service_role_key', true), current_setting('app.service_role_key', true));

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'http_post' AND n.nspname = 'net') THEN
    -- Just clear the column without re-pushing if pg_net isn't loaded.
    UPDATE public.notifications
       SET snoozed_until = NULL
     WHERE snoozed_until IS NOT NULL
       AND snoozed_until <= now();
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
  END IF;

  FOR v_rows IN
    SELECT user_id,
           array_agg(id ORDER BY created_at) AS ids,
           (array_agg(title ORDER BY created_at))[1] AS first_title,
           count(*) AS total
      FROM public.notifications
     WHERE snoozed_until IS NOT NULL
       AND snoozed_until <= now()
     GROUP BY user_id
  LOOP
    UPDATE public.notifications
       SET snoozed_until = NULL
     WHERE id = ANY (v_rows.ids);

    PERFORM net.http_post(
      url     => v_url || '/functions/v1/send-push-notification',
      headers => jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || COALESCE(v_key,'')),
      body    => jsonb_build_object(
        'user_id',           v_rows.user_id,
        'notification_type', 'snooze_resumed',
        'title',             CASE WHEN v_rows.total = 1 THEN v_rows.first_title
                                  ELSE 'You have ' || v_rows.total::text || ' reminders' END,
        'body',              CASE WHEN v_rows.total = 1 THEN NULL
                                  ELSE 'Snoozed notifications are back.' END,
        'data',              jsonb_build_object('url', '/notifications', 'snoozed_count', v_rows.total)
      )
    );

    v_count := v_count + v_rows.total;
  END LOOP;

  RETURN v_count;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'tick_unsnooze_notifications: %', SQLERRM;
  RETURN v_count;
END $$;

-- Schedule every 5 minutes.
DO $$ BEGIN
  PERFORM cron.unschedule('notifications-unsnooze-tick');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'notifications-unsnooze-tick',
  '*/5 * * * *',
  $$ SELECT public.tick_unsnooze_notifications(); $$
);
