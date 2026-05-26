-- Fix: Drop any broken triggers on user_followers that reference non-existent
-- column "followed_id" (correct column is "following_id"). Notifications are
-- handled by the application layer (send-push-notification edge function).

DO $$
DECLARE
  trig RECORD;
BEGIN
  FOR trig IN
    SELECT DISTINCT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'user_followers'
      AND event_object_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.user_followers', trig.trigger_name);
  END LOOP;
END;
$$;
