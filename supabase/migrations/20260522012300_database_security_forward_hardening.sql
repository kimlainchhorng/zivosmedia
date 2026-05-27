-- Forward-only hardening for existing public tables/views/functions.
-- This migration keeps historical files intact and closes runtime gaps with
-- explicit RLS, grants, security_invoker views, and function search_path.

-- Tables that already had policies in historical migrations but were missing
-- explicit RLS enable statements.
ALTER TABLE IF EXISTS public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.marketplace_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.import_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.import_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.import_order_events ENABLE ROW LEVEL SECURITY;

-- Shop/truck operational tables exposed through authenticated app flows.
ALTER TABLE IF EXISTS public.warehouse_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.truck_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.truck_offline_sales_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employee_clock_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_payroll_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.meta_conversion_events ENABLE ROW LEVEL SECURITY;

-- Keep Supabase's Data API exposure explicit for tables that are intentionally
-- reached by browser clients. RLS policies below still decide row access.
GRANT SELECT ON TABLE public.warehouses TO anon, authenticated;
GRANT SELECT ON TABLE public.marketplace_products TO anon, authenticated;
GRANT SELECT ON TABLE public.import_products TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.import_orders TO authenticated;
GRANT SELECT, INSERT ON TABLE public.import_order_events TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.warehouse_inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.truck_inventory TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.truck_offline_sales_queue TO authenticated;
GRANT SELECT, INSERT ON TABLE public.employee_clock_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.store_payroll_configs TO authenticated;
GRANT SELECT ON TABLE public.meta_conversion_events TO authenticated;

-- Explicit Data API grants for public tables introduced after Supabase's
-- automatic exposure behavior changed. RLS remains the security boundary.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.security_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.csp_violations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_employee_invites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.suggestion_dismissals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chat_thread_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_privacy TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ar_parts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ar_vin_lookups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ar_customer_vehicles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ar_inspections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ar_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ar_invoice_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ar_payouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_handover_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_group_bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_notification_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_yield_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_inventory_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ar_document_share_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_room_service_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_gift_vouchers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_parking_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_wakeup_calls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_laundry_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lodge_complaints TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.rate_limit_buckets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_lockout_state TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.post_bookmarks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_safety_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.post_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.post_reposts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.comment_likes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.blocked_link_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ar_service_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ar_customer_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ip_blocklist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_blocklist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.security_notification_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coin_daily_rewards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_message_reads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_polls TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_poll_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.live_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hotel_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.restaurant_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.car_rental_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.review_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.review_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.p2p_transfers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.group_expense_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_wallet_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.loyalty_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.loyalty_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.partner_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.event_rsvps TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_postings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.voice_rooms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.voice_room_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_totp_secrets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_e2e_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.custom_emoji_packs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.fitness_activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bug_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.affiliate_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recommendation_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_onboarding TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.employee_rule_acknowledgements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.bot_commands TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sms_send_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.network_security_events TO authenticated;

DROP POLICY IF EXISTS "Store staff can read warehouse inventory" ON public.warehouse_inventory;
CREATE POLICY "Store staff can read warehouse inventory"
  ON public.warehouse_inventory
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = warehouse_inventory.store_id
        AND s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.store_employees e
      WHERE e.store_id = warehouse_inventory.store_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Store owners can manage warehouse inventory" ON public.warehouse_inventory;
CREATE POLICY "Store owners can manage warehouse inventory"
  ON public.warehouse_inventory
  FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = warehouse_inventory.store_id
        AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = warehouse_inventory.store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store staff can read truck inventory" ON public.truck_inventory;
CREATE POLICY "Store staff can read truck inventory"
  ON public.truck_inventory
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR driver_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = truck_inventory.store_id
        AND s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.store_employees e
      WHERE e.store_id = truck_inventory.store_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Store staff can update assigned truck inventory" ON public.truck_inventory;
CREATE POLICY "Store staff can update assigned truck inventory"
  ON public.truck_inventory
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR driver_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = truck_inventory.store_id
        AND s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.store_employees e
      WHERE e.store_id = truck_inventory.store_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
        AND (e.assigned_truck_label IS NULL OR e.assigned_truck_label = truck_inventory.truck_label)
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR driver_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = truck_inventory.store_id
        AND s.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.store_employees e
      WHERE e.store_id = truck_inventory.store_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
        AND (e.assigned_truck_label IS NULL OR e.assigned_truck_label = truck_inventory.truck_label)
    )
  );

DROP POLICY IF EXISTS "Store owners can manage truck inventory" ON public.truck_inventory;
CREATE POLICY "Store owners can manage truck inventory"
  ON public.truck_inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = truck_inventory.store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store staff can read offline sale queue" ON public.truck_offline_sales_queue;
CREATE POLICY "Store staff can read offline sale queue"
  ON public.truck_offline_sales_queue
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR driver_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = truck_offline_sales_queue.store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store staff can insert offline sale queue" ON public.truck_offline_sales_queue;
CREATE POLICY "Store staff can insert offline sale queue"
  ON public.truck_offline_sales_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_user_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.store_profiles s
        WHERE s.id = truck_offline_sales_queue.store_id
          AND s.owner_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.store_employees e
        WHERE e.store_id = truck_offline_sales_queue.store_id
          AND e.user_id = auth.uid()
          AND e.status = 'active'
      )
    )
  );

DROP POLICY IF EXISTS "Store owners can update offline sale queue" ON public.truck_offline_sales_queue;
CREATE POLICY "Store owners can update offline sale queue"
  ON public.truck_offline_sales_queue
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = truck_offline_sales_queue.store_id
        AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = truck_offline_sales_queue.store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store staff can read clock logs" ON public.employee_clock_logs;
CREATE POLICY "Store staff can read clock logs"
  ON public.employee_clock_logs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR employee_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = employee_clock_logs.store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Employees can insert own clock logs" ON public.employee_clock_logs;
CREATE POLICY "Employees can insert own clock logs"
  ON public.employee_clock_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.store_employees e
      WHERE e.id = employee_clock_logs.employee_id
        AND e.store_id = employee_clock_logs.store_id
        AND e.user_id = auth.uid()
        AND e.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Store owners can read payroll configs" ON public.store_payroll_configs;
CREATE POLICY "Store owners can read payroll configs"
  ON public.store_payroll_configs
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = store_payroll_configs.store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners can upsert payroll configs" ON public.store_payroll_configs;
CREATE POLICY "Store owners can upsert payroll configs"
  ON public.store_payroll_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = store_payroll_configs.store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners can update payroll configs" ON public.store_payroll_configs;
CREATE POLICY "Store owners can update payroll configs"
  ON public.store_payroll_configs
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = store_payroll_configs.store_id
        AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = store_payroll_configs.store_id
        AND s.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can read meta conversion events" ON public.meta_conversion_events;
CREATE POLICY "Admins can read meta conversion events"
  ON public.meta_conversion_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Harden legacy public views so they execute with the caller's privileges.
ALTER VIEW IF EXISTS public.square_connections_safe SET (security_invoker = true);
ALTER VIEW IF EXISTS public.auth_relay_tokens_safe SET (security_invoker = true);
ALTER VIEW IF EXISTS public.flight_passengers_safe SET (security_invoker = true);
ALTER VIEW IF EXISTS public.profiles_public SET (security_invoker = true);
ALTER VIEW IF EXISTS public.ads_studio_creative_stats SET (security_invoker = true);
ALTER VIEW IF EXISTS public.ads_studio_winner_history SET (security_invoker = true);
ALTER VIEW IF EXISTS public.public_profiles SET (security_invoker = true);

-- Dynamic fallback for databases where only a subset of the legacy views exists.
DO $$
DECLARE
  view_name text;
BEGIN
  FOREACH view_name IN ARRAY ARRAY[
    'square_connections_safe',
    'auth_relay_tokens_safe',
    'flight_passengers_safe',
    'profiles_public',
    'ads_studio_creative_stats',
    'ads_studio_winner_history',
    'public_profiles'
  ]
  LOOP
    IF to_regclass(format('public.%I', view_name)) IS NOT NULL THEN
      EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', view_name);
    END IF;
  END LOOP;
END $$;

-- Ensure public SECURITY DEFINER functions use an explicit lookup path. This
-- is idempotent and applies to existing functions regardless of signature.
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, extensions',
      fn.nspname,
      fn.proname,
      fn.identity_args
    );
  END LOOP;
END $$;
