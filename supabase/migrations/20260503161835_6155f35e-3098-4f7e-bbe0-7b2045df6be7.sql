
-- Restore table-level grants on profiles. RLS still enforces row-level access.
-- PII columns are protected via RLS policies + RPC functions (get_my_profile, admin_get_profile).
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
