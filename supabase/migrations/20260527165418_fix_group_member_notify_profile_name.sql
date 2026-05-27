-- public.public_profiles no longer exposes username. Keep group member-added
-- notifications working with the fields that are actually available.

create or replace function public.tg_chat_group_member_added_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_name text;
  v_creator_id uuid;
  v_actor_name text;
begin
  if new.user_id is null then
    return new;
  end if;

  select name, created_by
  into v_group_name, v_creator_id
  from public.chat_groups
  where id = new.group_id
  limit 1;

  if v_group_name is null then
    return new;
  end if;

  if new.user_id = v_creator_id then
    return new;
  end if;

  select coalesce(full_name, 'Someone')
  into v_actor_name
  from public.public_profiles
  where user_id = v_creator_id
  limit 1;

  insert into public.notifications
    (user_id, channel, category, template, title, body, action_url, status, metadata)
  values
    (
      new.user_id,
      'in_app',
      'social',
      'group_added',
      'Added to ' || v_group_name,
      coalesce(v_actor_name, 'Someone') || ' added you to the group',
      '/chat?group=' || new.group_id::text,
      'sent',
      jsonb_build_object('group_id', new.group_id, 'role', new.role)
    );

  return new;
end;
$$;
