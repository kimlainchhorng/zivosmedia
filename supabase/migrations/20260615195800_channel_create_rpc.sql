-- Create a channel and subscribe the creator as the channel owner.
-- SECURITY DEFINER is needed because normal self-subscribe RLS only permits
-- subscriber/pending roles, while the creator must receive the owner role.
create or replace function public.channel_create(
  p_name text,
  p_handle text,
  p_description text,
  p_is_public boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_channel public.channels;
begin
  if v_user_id is null then
    raise exception 'Sign in required';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'Name is required';
  end if;

  if p_handle is null or p_handle !~ '^[a-z][a-z0-9_]{2,31}$' then
    raise exception 'Handle must be 3-32 characters, start with a letter, and use only lowercase letters, numbers, or underscores';
  end if;

  if exists (select 1 from public.channels where handle = p_handle) then
    raise exception 'Handle is taken';
  end if;

  insert into public.channels (name, handle, description, is_public, owner_id)
  values (trim(p_name), p_handle, nullif(trim(p_description), ''), coalesce(p_is_public, true), v_user_id)
  returning * into v_channel;

  insert into public.channel_subscribers (channel_id, user_id, role)
  values (v_channel.id, v_user_id, 'owner')
  on conflict (channel_id, user_id) do update
    set role = 'owner';

  return jsonb_build_object('id', v_channel.id, 'handle', v_channel.handle);
end;
$$;

grant execute on function public.channel_create(text, text, text, boolean) to authenticated;
