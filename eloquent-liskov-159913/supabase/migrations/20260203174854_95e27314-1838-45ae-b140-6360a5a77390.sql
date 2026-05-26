-- Fix overly permissive RLS policies that use WITH CHECK (true)
-- These should be restricted to service_role for backend-only operations

-- 1. ai_model_metrics - Should only be written by backend services
DROP POLICY IF EXISTS "System can write model metrics" ON public.ai_model_metrics;
CREATE POLICY "Service role can insert model metrics"
ON public.ai_model_metrics
FOR INSERT
TO service_role
WITH CHECK (true);

-- 2. country_analytics - Should only be written by backend services  
DROP POLICY IF EXISTS "System can write analytics" ON public.country_analytics;
CREATE POLICY "Service role can insert country analytics"
ON public.country_analytics
FOR INSERT
TO service_role
WITH CHECK (true);

-- 3. flight_payment_audit_log - Already named for service_role but uses public
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.flight_payment_audit_log;
CREATE POLICY "Service role inserts payment audit logs"
ON public.flight_payment_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- 4. system_health_history - Should only be written by backend services
DROP POLICY IF EXISTS "System can write health history" ON public.system_health_history;
CREATE POLICY "Service role can insert health history"
ON public.system_health_history
FOR INSERT
TO service_role
WITH CHECK (true);

-- 5. user_behavior_signals - Should only be written by backend services
DROP POLICY IF EXISTS "System can insert behavior" ON public.user_behavior_signals;
CREATE POLICY "Service role can insert behavior signals"
ON public.user_behavior_signals
FOR INSERT
TO service_role
WITH CHECK (true);

-- 6. zivo_referrals - Should use proper user validation, not open INSERT
DROP POLICY IF EXISTS "System can insert referrals" ON public.zivo_referrals;
CREATE POLICY "Service role can insert referrals"
ON public.zivo_referrals
FOR INSERT
TO service_role
WITH CHECK (true);

-- 7. zivo_wallet_transactions - Should only be written by backend services
DROP POLICY IF EXISTS "System can insert transactions" ON public.zivo_wallet_transactions;
CREATE POLICY "Service role can insert wallet transactions"
ON public.zivo_wallet_transactions
FOR INSERT
TO service_role
WITH CHECK (true);

-- 8. legal_audit_log - Should only be written by backend services
DROP POLICY IF EXISTS "lal_insert" ON public.legal_audit_log;
CREATE POLICY "Service role can insert legal audit logs"
ON public.legal_audit_log
FOR INSERT
TO service_role
WITH CHECK (true);