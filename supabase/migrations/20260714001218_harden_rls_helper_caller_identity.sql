-- Harden the RLS helper RPCs that were made anonymously executable in
-- 20260608191657. SECURITY DEFINER alone is not an authorization boundary:
-- the prior parameterized variants allowed an RPC caller to ask about an
-- arbitrary user id. Browser callers must be bound to the identity in the
-- verified JWT. The service_role exception is intentional: Edge Functions
-- validate the end-user token before using these helpers and then run the RPC
-- through a trusted service-role client.

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select auth.uid() as uid, auth.role() as jwt_role
  )
  select case
    when caller.jwt_role = 'service_role' then exists (
      select 1
      from public.user_roles
      where user_id = _user_id
        and role = _role
    )
    when caller.uid is null then false
    when _user_id is not null and _user_id is distinct from caller.uid then false
    else exists (
      select 1
      from public.user_roles
      where user_id = caller.uid
        and role = _role
    )
  end
  from caller;
$$;

create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select auth.uid() as uid, auth.role() as jwt_role
  )
  select case
    when caller.jwt_role = 'service_role' then exists (
      select 1
      from public.user_roles
      where user_id = _user_id
        and role::text = _role
    )
    when caller.uid is null then false
    when _user_id is not null and _user_id is distinct from caller.uid then false
    else exists (
      select 1
      from public.user_roles
      where user_id = caller.uid
        and role::text = _role
    )
  end
  from caller;
$$;

-- Keep the existing `user_uuid` argument name. PostgREST exposes input names
-- as RPC argument names, and CREATE OR REPLACE cannot safely rename it.
create or replace function public.is_admin(user_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(coalesce(user_uuid, auth.uid()), 'admin'::public.app_role);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

create or replace function public.is_store_owner(_store_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select auth.uid() as uid, auth.role() as jwt_role
  )
  select case
    when caller.jwt_role = 'service_role' then exists (
      select 1
      from public.store_profiles
      where id = _store_id
        and owner_id = _user_id
    )
    when caller.uid is null then false
    when _user_id is not null and _user_id is distinct from caller.uid then false
    else exists (
      select 1
      from public.store_profiles
      where id = _store_id
        and owner_id = caller.uid
    )
  end
  from caller;
$$;

create or replace function public.is_store_owner(_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select auth.uid() as uid
  )
  select caller.uid is not null and (
    exists (
      select 1
      from public.restaurants
      where id = _store_id
        and owner_id = caller.uid
    )
    or exists (
      select 1
      from public.store_profiles
      where id = _store_id
        and owner_id = caller.uid
    )
  )
  from caller;
$$;

create or replace function public.is_lodge_store_owner(_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select auth.uid() as uid
  )
  select caller.uid is not null and exists (
    select 1
    from public.store_profiles
    where id = _store_id
      and owner_id = caller.uid
  )
  from caller;
$$;

create or replace function public.is_trip_participant(_ride_id uuid, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select auth.uid() as uid, auth.role() as jwt_role
  )
  select case
    when caller.jwt_role = 'service_role' then exists (
      select 1
      from public.ride_requests as ride
      left join public.drivers as driver on driver.id = ride.assigned_driver_id
      where ride.id = _ride_id
        and (ride.user_id = _user_id or driver.user_id = _user_id)
    )
    when caller.uid is null then false
    when _user_id is not null and _user_id is distinct from caller.uid then false
    else exists (
      select 1
      from public.ride_requests as ride
      left join public.drivers as driver on driver.id = ride.assigned_driver_id
      where ride.id = _ride_id
        and (ride.user_id = caller.uid or driver.user_id = caller.uid)
    )
  end
  from caller;
$$;

-- Revoke the default PUBLIC grant for all affected overloads. Explicit anon
-- grants remain only for helpers whose now-context-bound predicates are still
-- evaluated by existing public RLS SELECT policies; without those grants
-- Postgres returns 42501 before it can evaluate the public branch. They return
-- false when auth.uid() is null and reject another user's id. The chat helper
-- RPCs are not public-read predicates and recover the stricter 20260605 policy.
do $$
declare
  target record;
  fn regprocedure;
begin
  for target in
    select *
    from (
      values
        ('public.has_role(uuid,public.app_role)', true),
        ('public.has_role(uuid,text)', true),
        ('public.is_admin()', true),
        ('public.is_admin(uuid)', true),
        ('public.is_store_owner(uuid)', true),
        ('public.is_store_owner(uuid,uuid)', true),
        ('public.is_lodge_store_owner(uuid)', true),
        ('public.is_trip_participant(uuid,uuid)', true),
        ('public.is_chat_member(uuid)', false),
        ('public.is_chat_participant(uuid,uuid)', false)
    ) as helpers(signature, allow_anonymous)
  loop
    fn := to_regprocedure(target.signature);
    if fn is null then
      raise notice 'Skipping missing RLS helper %', target.signature;
      continue;
    end if;

    execute format('revoke execute on function %s from public', fn);
    execute format('revoke execute on function %s from anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);

    if target.allow_anonymous then
      execute format('grant execute on function %s to anon', fn);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
