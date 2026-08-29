-- Probe v2. The first attempt guarded on current_user, which is useless inside
-- a SECURITY DEFINER function: it is always the owner, so the check passed for
-- everyone. Only the JWT-derived auth.uid()/auth.role() are meaningful there.
-- Dropped in 20260829192614_restrict_role_lookups_to_self_or_server.sql.
create or replace function public.has_role_probe(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path to 'public'
as $function$
  select case
    when _user_id is not distinct from auth.uid()
      or auth.role() = 'service_role'
      or auth.role() is null
    then exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
    else false
  end
$function$;
