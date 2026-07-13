-- Manager-checked channel member management RPCs.
-- Keeps member role/remove/exception writes behind backend authorization and
-- records the corresponding admin-log entry atomically.

create or replace function public.channel_set_member_role(
  p_channel_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner_id uuid;
  v_role public.channel_role;
begin
  if v_actor is null then
    raise exception 'Sign in required';
  end if;

  if not public.is_channel_manager(p_channel_id, v_actor) then
    raise exception 'Only channel owners and admins can update members';
  end if;

  if p_user_id = v_actor then
    raise exception 'You cannot change your own channel role';
  end if;

  select owner_id into v_owner_id
  from public.channels
  where id = p_channel_id;

  if not found then
    raise exception 'Channel not found';
  end if;

  if p_user_id = v_owner_id then
    raise exception 'The channel owner role cannot be changed';
  end if;

  if p_role not in ('admin', 'sub') then
    raise exception 'Invalid channel role';
  end if;

  v_role := p_role::public.channel_role;

  update public.channel_subscribers
  set role = v_role
  where channel_id = p_channel_id
    and user_id = p_user_id
    and role <> 'owner';

  if not found then
    raise exception 'Channel member not found';
  end if;

  insert into public.channel_admin_log (channel_id, actor_id, action, target_user_id, meta)
  values (p_channel_id, v_actor, 'role_changed', p_user_id, jsonb_build_object('role', p_role));
end;
$$;

grant execute on function public.channel_set_member_role(uuid, uuid, text) to authenticated;

create or replace function public.channel_remove_member(
  p_channel_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_owner_id uuid;
begin
  if v_actor is null then
    raise exception 'Sign in required';
  end if;

  if not public.is_channel_manager(p_channel_id, v_actor) then
    raise exception 'Only channel owners and admins can remove members';
  end if;

  if p_user_id = v_actor then
    raise exception 'You cannot remove yourself from channel settings';
  end if;

  select owner_id into v_owner_id
  from public.channels
  where id = p_channel_id;

  if not found then
    raise exception 'Channel not found';
  end if;

  if p_user_id = v_owner_id then
    raise exception 'The channel owner cannot be removed';
  end if;

  delete from public.channel_subscribers
  where channel_id = p_channel_id
    and user_id = p_user_id
    and role <> 'owner';

  if not found then
    raise exception 'Channel member not found';
  end if;

  insert into public.channel_removed_users (channel_id, user_id, removed_by)
  values (p_channel_id, p_user_id, v_actor)
  on conflict (channel_id, user_id) do update
  set removed_by = excluded.removed_by,
      removed_at = now();

  insert into public.channel_admin_log (channel_id, actor_id, action, target_user_id, meta)
  values (p_channel_id, v_actor, 'member_removed', p_user_id, '{}'::jsonb);
end;
$$;

grant execute on function public.channel_remove_member(uuid, uuid) to authenticated;

create or replace function public.channel_allow_rejoin(
  p_channel_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Sign in required';
  end if;

  if not public.is_channel_manager(p_channel_id, v_actor) then
    raise exception 'Only channel owners and admins can update removed users';
  end if;

  delete from public.channel_removed_users
  where channel_id = p_channel_id
    and user_id = p_user_id;

  if not found then
    raise exception 'Removed user not found';
  end if;

  insert into public.channel_admin_log (channel_id, actor_id, action, target_user_id, meta)
  values (p_channel_id, v_actor, 'member_unbanned', p_user_id, '{}'::jsonb);
end;
$$;

grant execute on function public.channel_allow_rejoin(uuid, uuid) to authenticated;

create or replace function public.channel_set_permission_exception(
  p_channel_id uuid,
  p_user_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Sign in required';
  end if;

  if not public.is_channel_manager(p_channel_id, v_actor) then
    raise exception 'Only channel owners and admins can update permission exceptions';
  end if;

  if p_enabled then
    insert into public.channel_permission_exceptions (channel_id, user_id, created_by)
    values (p_channel_id, p_user_id, v_actor)
    on conflict (channel_id, user_id) do update
    set created_by = excluded.created_by,
        created_at = now();
  else
    delete from public.channel_permission_exceptions
    where channel_id = p_channel_id
      and user_id = p_user_id;
  end if;

  insert into public.channel_admin_log (channel_id, actor_id, action, target_user_id, meta)
  values (
    p_channel_id,
    v_actor,
    'settings_changed',
    p_user_id,
    jsonb_build_object('permission_exception', p_enabled)
  );
end;
$$;

grant execute on function public.channel_set_permission_exception(uuid, uuid, boolean) to authenticated;
