
-- Remove sensitive tables from Realtime publication (no IF EXISTS for DROP TABLE in publications)
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'admin_driver_messages','admin_notifications','admin_security_alerts',
    'call_signals','driver_earnings','drivers','drivers_status',
    'profiles','alerts','chat_members','lost_item_requests',
    'order_disputes','refund_requests','ride_requests','jobs'
  ] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', tbl);
    EXCEPTION WHEN OTHERS THEN
      NULL; -- table might not be in publication
    END;
  END LOOP;
END $$;

-- Fix RLS enabled with no policy: square_connections
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='square_connections' AND policyname='square_connections_select_own') THEN
    CREATE POLICY "square_connections_select_own" ON public.square_connections FOR SELECT TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='square_connections' AND policyname='square_connections_insert_own') THEN
    CREATE POLICY "square_connections_insert_own" ON public.square_connections FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='square_connections' AND policyname='square_connections_update_own') THEN
    CREATE POLICY "square_connections_update_own" ON public.square_connections FOR UPDATE TO authenticated USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='square_connections' AND policyname='square_connections_delete_own') THEN
    CREATE POLICY "square_connections_delete_own" ON public.square_connections FOR DELETE TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;
