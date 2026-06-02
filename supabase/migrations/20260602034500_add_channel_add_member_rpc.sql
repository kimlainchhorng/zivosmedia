-- Lets channel managers add other users as subscribers.
-- RLS on channel_subscribers only allows self-subscribe, so manager-driven adds
-- go through this SECURITY DEFINER function (gated to managers, skips banned users).
create or replace function public.channel_add_member(p_channel_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_channel_manager(p_channel_id, auth.uid()) then
    raise exception 'only channel managers can add members';
  end if;
  if exists (
    select 1 from public.channel_removed_users r
    where r.channel_id = p_channel_id and r.user_id = p_user_id
  ) then
    raise exception 'user is removed from this channel';
  end if;
  insert into public.channel_subscribers (channel_id, user_id, role)
  values (p_channel_id, p_user_id, 'sub')
  on conflict (channel_id, user_id) do nothing;
end;
$$;

grant execute on function public.channel_add_member(uuid, uuid) to authenticated;
