alter table public.channels
  add column if not exists channel_join_approval_required boolean not null default false;

comment on column public.channels.channel_join_approval_required is
  'Whether new channel joins should be stored as pending until an admin approves them.';

do $$
begin
  alter type public.channel_role add value if not exists 'pending';
exception
  when duplicate_object then null;
end $$;

create or replace function public.can_view_channel(_channel_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.channels c
    where c.id = _channel_id
      and (
        c.is_public = true
        or c.owner_id = _user_id
        or exists (
          select 1 from public.channel_subscribers s
          where s.channel_id = _channel_id
            and s.user_id = _user_id
            and s.role::text in ('owner','admin','sub')
        )
      )
  );
$$;

drop policy if exists "user can subscribe self" on public.channel_subscribers;
create policy "user can subscribe self"
  on public.channel_subscribers for insert
  with check (
    user_id = auth.uid()
    and (
      role::text = 'sub'
      and not exists (
        select 1 from public.channels c
        where c.id = channel_id and c.channel_join_approval_required = true
      )
      or role::text = 'pending'
      and exists (
        select 1 from public.channels c
        where c.id = channel_id and c.channel_join_approval_required = true
      )
    )
  );

create or replace function public.bump_channel_sub_count()
returns trigger language plpgsql set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    if new.role::text <> 'pending' then
      update public.channels set subscriber_count = subscriber_count + 1 where id = new.channel_id;
    end if;
  elsif (tg_op = 'DELETE') then
    if old.role::text <> 'pending' then
      update public.channels set subscriber_count = greatest(subscriber_count - 1, 0) where id = old.channel_id;
    end if;
  elsif (tg_op = 'UPDATE') then
    if old.role::text = 'pending' and new.role::text <> 'pending' then
      update public.channels set subscriber_count = subscriber_count + 1 where id = new.channel_id;
    elsif old.role::text <> 'pending' and new.role::text = 'pending' then
      update public.channels set subscriber_count = greatest(subscriber_count - 1, 0) where id = old.channel_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_subs_count on public.channel_subscribers;
create trigger trg_subs_count after insert or update of role or delete on public.channel_subscribers
  for each row execute function public.bump_channel_sub_count();
