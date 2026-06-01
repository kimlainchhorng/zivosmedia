-- Data API grants for legal policy, consent, and compliance tables.
-- Supabase's 2026 Data API default requires explicit grants; RLS remains the
-- row-level enforcement layer for authenticated users.

grant usage on schema public to anon, authenticated;

-- Public policy/version surfaces. RLS limits rows to active/public records.
grant select on table public.legal_policies to anon, authenticated;
grant select on table public.role_terms to anon, authenticated;
grant select on table public.seller_of_travel_status to anon, authenticated;
grant select on table public.policy_versions to anon, authenticated;

-- User-owned acceptance records. Users can read and create their own records;
-- policy_consents can also be updated by the owner for revocation.
grant select, insert on table public.user_consent_logs to authenticated;
grant select, insert on table public.role_terms_acceptance to authenticated;
grant select, insert, update on table public.user_consents to authenticated;
grant select, insert, update on table public.policy_consents to authenticated;

-- Dispute and audit surfaces are authenticated only; RLS/admin policies decide
-- which rows can be read or managed.
grant select, insert on table public.legal_disputes to authenticated;
grant insert on table public.legal_audit_log to authenticated;

-- Keep service-role API clients explicit as Supabase removes implicit public
-- schema grants. Service-role use is still server-only.
grant all privileges on table public.legal_policies to service_role;
grant all privileges on table public.user_consent_logs to service_role;
grant all privileges on table public.role_terms to service_role;
grant all privileges on table public.role_terms_acceptance to service_role;
grant all privileges on table public.seller_of_travel_status to service_role;
grant all privileges on table public.legal_disputes to service_role;
grant all privileges on table public.legal_audit_log to service_role;
grant all privileges on table public.policy_versions to service_role;
grant all privileges on table public.policy_consents to service_role;
grant all privileges on table public.user_consents to service_role;
