-- Group paid media bundles.
-- Extends the existing Stars unlock flow from one locked image/video to a
-- Telegram-style bundle stored in group_messages.file_payload.locked_items.

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

  if v_message.message_type not in ('locked_image', 'locked_video', 'locked_album') then
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
            coalesce(gm.message_type, '') not in ('locked_image', 'locked_video', 'locked_album')
            and (gm.image_url = storage.objects.name or gm.video_url = storage.objects.name or gm.voice_url = storage.objects.name)
          )
          or (
            coalesce(gm.message_type, '') in ('locked_image', 'locked_video')
            and (gm.file_payload->>'locked_preview_url' = storage.objects.name
              or gm.file_payload->>'locked_preview_image_url' = storage.objects.name)
          )
          or (
            coalesce(gm.message_type, '') = 'locked_album'
            and exists (
              select 1
              from jsonb_array_elements(
                case
                  when jsonb_typeof(gm.file_payload->'locked_items') = 'array' then gm.file_payload->'locked_items'
                  else '[]'::jsonb
                end
              ) as locked_item(item)
              where locked_item.item->>'preview_path' = storage.objects.name
            )
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
          or (
            coalesce(gm.message_type, '') = 'locked_album'
            and exists (
              select 1
              from jsonb_array_elements(
                case
                  when jsonb_typeof(gm.file_payload->'locked_items') = 'array' then gm.file_payload->'locked_items'
                  else '[]'::jsonb
                end
              ) as locked_item(item)
              where locked_item.item->>'original_path' = storage.objects.name
            )
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
