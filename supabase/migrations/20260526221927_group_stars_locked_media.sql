-- Group Stars locked media.
-- Adds Telegram-style paid media to group chat while keeping existing direct
-- message Stripe unlocks on the current path.

create schema if not exists private;

alter table public.group_messages
  add column if not exists locked_price_coins integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'group_messages_locked_price_coins_check'
      and conrelid = 'public.group_messages'::regclass
  ) then
    alter table public.group_messages
      add constraint group_messages_locked_price_coins_check
      check (locked_price_coins is null or locked_price_coins between 1 and 1000000)
      not valid;
  end if;
end $$;

create index if not exists idx_group_messages_locked_media
  on public.group_messages (group_id, created_at desc)
  where locked_price_coins is not null;

alter table public.media_unlocks
  add column if not exists message_table text not null default 'direct_messages',
  add column if not exists unlock_provider text not null default 'stripe',
  add column if not exists amount_coins integer,
  add column if not exists group_id uuid,
  add column if not exists completed_at timestamptz;

update public.media_unlocks
set
  message_table = coalesce(message_table, 'direct_messages'),
  unlock_provider = coalesce(unlock_provider, 'stripe'),
  completed_at = case
    when status = 'completed' and completed_at is null then updated_at
    else completed_at
  end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_unlocks_message_table_check'
      and conrelid = 'public.media_unlocks'::regclass
  ) then
    alter table public.media_unlocks
      add constraint media_unlocks_message_table_check
      check (message_table in ('direct_messages', 'group_messages'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_unlocks_unlock_provider_check'
      and conrelid = 'public.media_unlocks'::regclass
  ) then
    alter table public.media_unlocks
      add constraint media_unlocks_unlock_provider_check
      check (unlock_provider in ('stripe', 'coins'))
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_unlocks_amount_coins_check'
      and conrelid = 'public.media_unlocks'::regclass
  ) then
    alter table public.media_unlocks
      add constraint media_unlocks_amount_coins_check
      check (amount_coins is null or amount_coins between 1 and 1000000)
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_unlocks_group_id_fkey'
      and conrelid = 'public.media_unlocks'::regclass
  ) then
    alter table public.media_unlocks
      add constraint media_unlocks_group_id_fkey
      foreign key (group_id)
      references public.chat_groups(id)
      on delete cascade
      not valid;
  end if;
end $$;

create index if not exists idx_media_unlocks_lookup
  on public.media_unlocks (message_table, message_id, buyer_id, status);

create index if not exists idx_media_unlocks_group_completed
  on public.media_unlocks (group_id, buyer_id, created_at desc)
  where message_table = 'group_messages' and status = 'completed';

create unique index if not exists idx_media_unlocks_completed_unique
  on public.media_unlocks (message_table, message_id, buyer_id)
  where message_table = 'group_messages' and status = 'completed';

-- Keep users from manufacturing completed unlock rows via the REST API. Edge
-- functions use the service role and bypass RLS for inserts/updates.
drop policy if exists "Users can create unlocks" on public.media_unlocks;
drop policy if exists "Users can create pending checkout unlocks" on public.media_unlocks;
create policy "Users can create pending checkout unlocks"
  on public.media_unlocks for insert
  to authenticated
  with check (
    (select auth.uid()) = buyer_id
    and status = 'pending'
    and message_table = 'direct_messages'
    and unlock_provider = 'stripe'
  );

drop policy if exists "System can update unlocks" on public.media_unlocks;

create or replace function private.unlock_group_locked_media(
  p_actor_id uuid,
  p_message_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message public.group_messages%rowtype;
  v_price integer;
  v_buyer_balance integer;
  v_seller_balance integer;
  v_first_user uuid;
  v_second_user uuid;
begin
  if p_actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
  into v_message
  from public.group_messages
  where id = p_message_id
  for update;

  if not found then
    raise exception 'MESSAGE_NOT_FOUND';
  end if;

  if v_message.hidden_at is not null then
    raise exception 'MESSAGE_UNAVAILABLE';
  end if;

  if v_message.message_type not in ('locked_image', 'locked_video') then
    raise exception 'MESSAGE_NOT_LOCKED';
  end if;

  v_price := coalesce(v_message.locked_price_coins, 0);
  if v_price <= 0 then
    raise exception 'INVALID_PRICE';
  end if;

  if v_message.sender_id = p_actor_id then
    return jsonb_build_object(
      'unlocked', true,
      'own_message', true,
      'message_id', p_message_id,
      'price_coins', v_price
    );
  end if;

  if not exists (
    select 1
    from public.chat_group_members cgm
    where cgm.group_id = v_message.group_id
      and cgm.user_id = p_actor_id
  ) then
    raise exception 'NOT_GROUP_MEMBER';
  end if;

  if exists (
    select 1
    from public.media_unlocks mu
    where mu.message_table = 'group_messages'
      and mu.message_id = p_message_id::text
      and mu.buyer_id = p_actor_id
      and mu.status = 'completed'
  ) then
    select balance
    into v_buyer_balance
    from public.user_coin_balances
    where user_id = p_actor_id;

    return jsonb_build_object(
      'unlocked', true,
      'already_unlocked', true,
      'message_id', p_message_id,
      'price_coins', v_price,
      'balance', coalesce(v_buyer_balance, 0)
    );
  end if;

  perform public.ensure_coin_balance(p_actor_id);
  perform public.ensure_coin_balance(v_message.sender_id);

  if p_actor_id::text < v_message.sender_id::text then
    v_first_user := p_actor_id;
    v_second_user := v_message.sender_id;
  else
    v_first_user := v_message.sender_id;
    v_second_user := p_actor_id;
  end if;

  perform 1 from public.user_coin_balances where user_id = v_first_user for update;
  perform 1 from public.user_coin_balances where user_id = v_second_user for update;

  update public.user_coin_balances
     set balance = balance - v_price,
         updated_at = now()
   where user_id = p_actor_id
     and balance >= v_price
   returning balance into v_buyer_balance;

  if v_buyer_balance is null then
    raise exception 'INSUFFICIENT_STARS';
  end if;

  update public.user_coin_balances
     set balance = balance + v_price,
         updated_at = now()
   where user_id = v_message.sender_id
   returning balance into v_seller_balance;

  insert into public.media_unlocks (
    message_id,
    message_table,
    group_id,
    buyer_id,
    seller_id,
    amount_cents,
    amount_coins,
    unlock_provider,
    status,
    completed_at,
    updated_at
  )
  values (
    p_message_id::text,
    'group_messages',
    v_message.group_id,
    p_actor_id,
    v_message.sender_id,
    0,
    v_price,
    'coins',
    'completed',
    now(),
    now()
  )
  on conflict do nothing;

  insert into public.coin_transactions (user_id, delta, kind, reference_id, metadata)
  values
    (
      p_actor_id,
      -v_price,
      'group_media_unlock',
      p_message_id::text,
      jsonb_build_object(
        'group_id', v_message.group_id,
        'seller_id', v_message.sender_id,
        'message_type', v_message.message_type
      )
    ),
    (
      v_message.sender_id,
      v_price,
      'group_media_unlock_sale',
      p_message_id::text,
      jsonb_build_object(
        'group_id', v_message.group_id,
        'buyer_id', p_actor_id,
        'message_type', v_message.message_type
      )
    );

  return jsonb_build_object(
    'unlocked', true,
    'message_id', p_message_id,
    'price_coins', v_price,
    'balance', v_buyer_balance,
    'seller_balance', v_seller_balance
  );
end;
$$;

revoke all on function private.unlock_group_locked_media(uuid, uuid) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.unlock_group_locked_media(uuid, uuid) to service_role;

-- Locked group originals are readable only by the sender or completed unlock
-- buyers. The separate preview path remains readable to group members.
drop policy if exists "chat_media_select_owner_or_recipient" on storage.objects;
create policy "chat_media_select_owner_or_recipient"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('chat-media-files', 'chat_uploads')
  and (
    (select auth.uid())::text = split_part(storage.objects.name, '/', 1)
    or exists (
      select 1
      from public.direct_messages dm
      where (dm.image_url = storage.objects.name or dm.video_url = storage.objects.name or dm.voice_url = storage.objects.name)
        and (dm.sender_id = (select auth.uid()) or dm.receiver_id = (select auth.uid()))
    )
    or exists (
      select 1
      from public.group_messages gm
      join public.chat_group_members cgm on cgm.group_id = gm.group_id
      where cgm.user_id = (select auth.uid())
        and (
          (
            coalesce(gm.message_type, '') not in ('locked_image', 'locked_video')
            and (gm.image_url = storage.objects.name or gm.video_url = storage.objects.name or gm.voice_url = storage.objects.name)
          )
          or (
            coalesce(gm.message_type, '') in ('locked_image', 'locked_video')
            and (gm.file_payload->>'locked_preview_url' = storage.objects.name
              or gm.file_payload->>'locked_preview_image_url' = storage.objects.name)
          )
          or (
            coalesce(gm.message_type, '') in ('locked_image', 'locked_video')
            and (gm.image_url = storage.objects.name or gm.video_url = storage.objects.name)
            and (
              gm.sender_id = (select auth.uid())
              or exists (
                select 1
                from public.media_unlocks mu
                where mu.message_table = 'group_messages'
                  and mu.message_id = gm.id::text
                  and mu.buyer_id = (select auth.uid())
                  and mu.status = 'completed'
              )
            )
          )
        )
    )
    or exists (
      select 1
      from public.chat_groups cg
      join public.chat_group_members cgm on cgm.group_id = cg.id
      where cgm.user_id = (select auth.uid())
        and (
          cg.avatar_url = storage.objects.name
          or cg.avatar_url like '%/storage/v1/object/public/chat-media-files/' || storage.objects.name
        )
    )
  )
);
