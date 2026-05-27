
-- CRITICAL: Fix exposed auth relay tokens (anon can read/delete JWTs)
DROP POLICY IF EXISTS "anon_select_relay" ON public.auth_relay_tokens;
DROP POLICY IF EXISTS "anon_insert_relay" ON public.auth_relay_tokens;
DROP POLICY IF EXISTS "anon_delete_relay" ON public.auth_relay_tokens;

-- CRITICAL: Fix trips table exposing PII to public
DROP POLICY IF EXISTS "trips_select_by_id_public" ON public.trips;

-- CRITICAL: Fix wallet privilege escalation
DROP POLICY IF EXISTS "cw_update_auth" ON public.customer_wallets;
CREATE POLICY "cw_update_own" ON public.customer_wallets
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cwt_insert_auth" ON public.customer_wallet_transactions;

-- CRITICAL: Fix exposed employee expense records
DROP POLICY IF EXISTS "Anyone can read corp_expenses" ON public.corp_expenses;

-- CRITICAL: Fix partner applications PII exposure
DROP POLICY IF EXISTS "Public can read own application by tracking code" ON public.partner_portal_applications;

-- CRITICAL: Fix site_versions anon write/delete access
DROP POLICY IF EXISTS "public insert site_versions" ON public.site_versions;
DROP POLICY IF EXISTS "public delete site_versions" ON public.site_versions;
DROP POLICY IF EXISTS "public read site_versions" ON public.site_versions;

-- WARN: Fix overly broad driver wallet policies
DROP POLICY IF EXISTS "dw_read_auth" ON public.driver_wallets;
DROP POLICY IF EXISTS "wallet_tx_read_auth" ON public.wallet_transactions;

-- WARN: Fix fare breakdowns - drop broad policy (no user_id column, use service_role for access)
DROP POLICY IF EXISTS "Authenticated read own fare breakdowns" ON public.fare_breakdowns;

-- WARN: Fix tenant audit log and alerts overly broad policies
DROP POLICY IF EXISTS "tenant_audit_log_select_auth" ON public.tenant_audit_log;
DROP POLICY IF EXISTS "tenant_alerts_select_auth" ON public.tenant_admin_alerts;

-- WARN: Fix AI recommendations/rankings overly broad policies
DROP POLICY IF EXISTS "ai_recs_read_auth" ON public.ai_recommendations;
DROP POLICY IF EXISTS "ai_rank_read_auth" ON public.ai_search_rankings;
