-- has_role(uuid, ...) and is_admin(uuid) took any user id and answered without
-- an auth check, and both were reachable by anon. That let an unauthenticated
-- caller test whether any account is an admin — an enumeration primitive,
-- since user ids are exposed on public profiles.
--
-- The lookup is now answered only when the caller is asking about themselves,
-- or is a server-side caller. Inside a SECURITY DEFINER function current_user
-- is always the owner, so it is useless as a discriminator; only the
-- JWT-derived auth.uid()/auth.role() are meaningful. auth.role() is null means
-- there is no HTTP request at all (trigger, cron, direct SQL), which must keep
-- working.
--
-- Safe for RLS: all 1240 policy call sites pass auth.uid() (stored rewritten as
-- "( SELECT auth.uid() )"), or no argument / NULL::uuid which resolve to self.
-- None passes a table column. Verified for anon, authenticated-self,
-- authenticated-other and service_role, and with live RLS reads: an admin still
-- sees 619 user_roles rows, a non-admin sees 2, anon sees 0.
--
-- Rollback: restore the bodies to a bare
--   select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when _user_id is not distinct from auth.uid()
      or auth.role() = 'service_role'
      or auth.role() is null
    then exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
    else false
  end
$function$;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
  select case
    when _user_id is not distinct from auth.uid()
      or auth.role() = 'service_role'
      or auth.role() is null
    then exists (select 1 from public.user_roles where user_id = _user_id and role = _role::app_role)
    else false
  end
$function$;

-- is_admin(uuid) defaults NULL to the caller, so the guard compares the
-- resolved id rather than the raw argument.
create or replace function public.is_admin(user_uuid uuid default null::uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select case
    when coalesce(user_uuid, auth.uid()) is not distinct from auth.uid()
      or auth.role() = 'service_role'
      or auth.role() is null
    then exists (
      select 1 from public.user_roles
      where user_id = coalesce(user_uuid, auth.uid()) and role = 'admin'
    )
    else false
  end
$function$;

drop function if exists public.has_role_probe(uuid, app_role);
