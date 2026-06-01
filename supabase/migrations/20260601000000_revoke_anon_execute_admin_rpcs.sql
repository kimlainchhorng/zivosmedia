-- Revoke anonymous EXECUTE on admin-only SECURITY DEFINER RPCs
--
-- Source: Supabase security advisor `anon_security_definer_function_executable`.
-- These five functions are SECURITY DEFINER and were callable by the `anon`
-- role via PostgREST (/rest/v1/rpc/<fn>). Because EXECUTE is granted to PUBLIC
-- by default, `anon` inherits it — so we must REVOKE from PUBLIC (not just
-- anon) and then re-GRANT to the roles that legitimately call these (the app
-- invokes them as an authenticated admin; the function bodies enforce the
-- admin check internally; service_role for internal/cron callers).
--
-- Place at: supabase/migrations/20260601000000_revoke_anon_execute_admin_rpcs.sql
-- REVIEW BEFORE APPLYING. Confirm each signature still matches production:
--   select p.proname, pg_get_function_identity_arguments(p.oid)
--   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--   where n.nspname='public' and p.proname like 'admin\_%';

BEGIN;

REVOKE EXECUTE ON FUNCTION public.admin_bot_reports(p_status text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_bot_reports(p_status text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_bots_summary() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_bots_summary() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_feature_bot(p_bot_id uuid, p_featured boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_feature_bot(p_bot_id uuid, p_featured boolean) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_review_report(p_report_id uuid, p_status text, p_deactivate_bot boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_review_report(p_report_id uuid, p_status text, p_deactivate_bot boolean) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_set_bot_active(p_bot_id uuid, p_active boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_set_bot_active(p_bot_id uuid, p_active boolean) TO authenticated, service_role;

COMMIT;
