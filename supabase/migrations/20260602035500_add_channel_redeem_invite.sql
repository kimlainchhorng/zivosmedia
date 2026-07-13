-- Redeem a channel invite link: validates the code and subscribes the caller.
-- SECURITY DEFINER so it can subscribe + bump the use count past the self-only
-- RLS on channel_subscribers. Invite links bypass join-approval (you were invited),
-- but never let removed/banned users back in.
create or replace function public.channel_redeem_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.channel_invite_links;
begin
  select * into v_link from public.channel_invite_links where code = p_code;
  if not found or v_link.revoked then
    raise exception 'This invite link is invalid.';
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    raise exception 'This invite link has expired.';
  end if;
  if v_link.max_uses is not null and v_link.uses >= v_link.max_uses then
    raise exception 'This invite link has reached its limit.';
  end if;
  if exists (
    select 1 from public.channel_removed_users r
    where r.channel_id = v_link.channel_id and r.user_id = auth.uid()
  ) then
    raise exception 'You can no longer join this channel.';
  end if;

  insert into public.channel_subscribers (channel_id, user_id, role)
  values (v_link.channel_id, auth.uid(), 'sub')
  on conflict (channel_id, user_id) do nothing;

  update public.channel_invite_links set uses = uses + 1 where id = v_link.id;
  return v_link.channel_id;
end;
$$;

grant execute on function public.channel_redeem_invite(text) to authenticated;
