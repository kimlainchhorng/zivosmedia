
-- ============================================================
-- 1. CALL_SESSIONS: Hide real phone numbers via column-level grants
-- ============================================================
DROP POLICY IF EXISTS "Participants can read call_sessions" ON public.call_sessions;

-- Revoke full SELECT, then grant only safe columns
REVOKE SELECT ON public.call_sessions FROM authenticated;
GRANT SELECT (id, order_id, customer_user_id, driver_user_id, merchant_user_id, twilio_proxy_number, status, expires_at, created_at, updated_at)
ON public.call_sessions TO authenticated;

-- Re-create participant policy on allowed columns
CREATE POLICY "Participants can read call_sessions"
ON public.call_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() = customer_user_id
  OR auth.uid() = driver_user_id
  OR auth.uid() = merchant_user_id
);

-- Safe view without phone numbers
CREATE OR REPLACE VIEW public.call_sessions_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  order_id,
  customer_user_id,
  driver_user_id,
  merchant_user_id,
  twilio_proxy_number,
  status,
  expires_at,
  created_at,
  updated_at
FROM public.call_sessions;

-- ============================================================
-- 2. SQUARE_CONNECTIONS: Block raw token reads
-- ============================================================
DROP POLICY IF EXISTS "pos_integrations_select_own" ON public.square_connections;
DROP POLICY IF EXISTS "pos_integrations_select_restricted" ON public.square_connections;
REVOKE SELECT ON public.square_connections FROM authenticated;

-- ============================================================
-- 3. POS_INTEGRATIONS: Block raw token reads
-- ============================================================
DROP POLICY IF EXISTS "pos_integrations_select_own" ON public.pos_integrations;
DROP POLICY IF EXISTS "pos_integrations_select_restricted" ON public.pos_integrations;
REVOKE SELECT ON public.pos_integrations FROM authenticated;
