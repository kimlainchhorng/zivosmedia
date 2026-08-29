-- Temporary probe used to exercise the proposed has_role guard under anon /
-- authenticated / service_role before the real function was touched. Nothing
-- called it. Superseded by the v2 probe and dropped in
-- 20260829192614_restrict_role_lookups_to_self_or_server.sql.
--
-- Kept in history because it was applied to the remote; it is deliberately
-- not re-runnable as a no-op, so the drop lives in the later migration.
create or replace function public.has_role_probe(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when _user_id is not distinct from auth.uid()
      or coalesce(auth.role(), '') = 'service_role'
      or current_user in ('postgres', 'service_role')
    then exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
    else false
  end
$function$;

revoke execute on function public.has_role_probe(uuid, app_role) from public;
