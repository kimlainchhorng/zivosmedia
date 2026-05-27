-- ============================================================
-- 1. SQUARE_CONNECTIONS: Revoke direct SELECT, use existing safe view
-- ============================================================
DROP POLICY IF EXISTS "Users can view own square connections" ON public.square_connections;

DROP VIEW IF EXISTS public.square_connections_safe;
CREATE VIEW public.square_connections_safe AS
  SELECT id, user_id, square_merchant_id, square_location_id, env,
         location_ids, token_type, scopes, last_sync_at, status,
         error_message, created_at, updated_at
  FROM public.square_connections
  WHERE user_id = auth.uid();

GRANT SELECT ON public.square_connections_safe TO authenticated;

-- ============================================================
-- 2. AUTH_RELAY_TOKENS: Remove client-readable token access
-- ============================================================
DROP POLICY IF EXISTS "Users can read own relay tokens" ON public.auth_relay_tokens;

CREATE OR REPLACE VIEW public.auth_relay_tokens_safe AS
  SELECT relay_id, created_at
  FROM public.auth_relay_tokens
  WHERE relay_id = (auth.uid())::text;

GRANT SELECT ON public.auth_relay_tokens_safe TO authenticated;

-- ============================================================
-- 3. EMAIL_CONSENTS: Restrict INSERT to user's own email
-- ============================================================
DROP POLICY IF EXISTS "email_consents_insert_auth" ON public.email_consents;

CREATE POLICY "email_consents_insert_own_email" ON public.email_consents
  FOR INSERT TO authenticated
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================================
-- 4. FLIGHT_PASSENGERS: Create safe view without passport PII
-- ============================================================
CREATE OR REPLACE VIEW public.flight_passengers_safe AS
  SELECT id, booking_id, passenger_index, title, given_name, family_name,
         email, phone_number, ticket_number, created_at
  FROM public.flight_passengers;

GRANT SELECT ON public.flight_passengers_safe TO authenticated;

-- ============================================================
-- 5. REALTIME: Scope channel subscriptions
-- ============================================================
DROP POLICY IF EXISTS "realtime_read_private" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_read_table_topics" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_write_private" ON realtime.messages;
DROP POLICY IF EXISTS "realtime_write_table_topics" ON realtime.messages;

CREATE POLICY "realtime_read_scoped" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    topic LIKE 'table:public.messages:%'
    OR topic LIKE 'table:public.store_posts:%'
    OR topic LIKE 'table:public.food_orders:%'
    OR topic LIKE 'table:public.trips:%'
    OR topic LIKE 'table:public.chat_rooms:%'
    OR topic LIKE 'table:public.chat_messages:%'
    OR topic LIKE 'table:public.notifications:%'
    OR topic LIKE 'table:public.user_posts:%'
  );

CREATE POLICY "realtime_write_scoped" ON realtime.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    topic LIKE 'table:public.messages:%'
    OR topic LIKE 'table:public.store_posts:%'
    OR topic LIKE 'table:public.food_orders:%'
    OR topic LIKE 'table:public.trips:%'
    OR topic LIKE 'table:public.chat_rooms:%'
    OR topic LIKE 'table:public.chat_messages:%'
    OR topic LIKE 'table:public.notifications:%'
    OR topic LIKE 'table:public.user_posts:%'
  );

-- ============================================================
-- 6. SECURITY DEFINER: Fix get_jwt_role search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_jwt_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.jwt() ->> 'role';
$$;