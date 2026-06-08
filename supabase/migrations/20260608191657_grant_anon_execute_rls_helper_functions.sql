-- Repo home: supabase/migrations/20260608191657_grant_anon_execute_rls_helper_functions.sql
-- Applied to live zivosmedia project (slirphzzwcogdbkeicff) on 2026-06-08 via Supabase MCP.
--
-- Fix: a prior policy-consolidation migration dropped + recreated these SECURITY
-- DEFINER RLS-helper functions WITHOUT re-granting anon EXECUTE. Anonymous SELECT
-- policies that call them then aborted with 42501 (permission denied for function),
-- breaking the public / logged-out read path (social feed, lodging reviews, etc.)
-- across ~274 tables. These are boolean predicates that return false for anon
-- (auth.uid() is null), so granting EXECUTE restores intended public-read behaviour
-- and exposes nothing -- it mirrors the grant has_role already had.

grant execute on function public.is_admin() to anon;
grant execute on function public.is_admin(uuid) to anon;
grant execute on function public.is_store_owner(uuid) to anon;
grant execute on function public.is_store_owner(uuid, uuid) to anon;
grant execute on function public.is_lodge_store_owner(uuid) to anon;
grant execute on function public.is_chat_member(uuid) to anon;
grant execute on function public.is_chat_participant(uuid, uuid) to anon;
grant execute on function public.is_trip_participant(uuid, uuid) to anon;

-- Rollback (if ever needed):
-- revoke execute on function public.is_admin() from anon;
-- revoke execute on function public.is_admin(uuid) from anon;
-- revoke execute on function public.is_store_owner(uuid) from anon;
-- revoke execute on function public.is_store_owner(uuid, uuid) from anon;
-- revoke execute on function public.is_lodge_store_owner(uuid) from anon;
-- revoke execute on function public.is_chat_member(uuid) from anon;
-- revoke execute on function public.is_chat_participant(uuid, uuid) from anon;
-- revoke execute on function public.is_trip_participant(uuid, uuid) from anon;
