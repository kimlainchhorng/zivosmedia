-- Direct paid media bundles.
-- Recipients may read blurred previews for locked DMs; originals require the
-- sender or a completed direct_message_unlocks row created by the wallet RPC.

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
      where (dm.sender_id = (select auth.uid()) or dm.receiver_id = (select auth.uid()))
        and (
          (
            coalesce(dm.message_type, '') not in ('locked_image', 'locked_video', 'locked_album')
            and (dm.image_url = storage.objects.name or dm.video_url = storage.objects.name or dm.voice_url = storage.objects.name)
          )
          or (
            coalesce(dm.message_type, '') in ('locked_image', 'locked_video')
            and (
              dm.file_payload->>'locked_preview_url' = storage.objects.name
              or dm.file_payload->>'locked_preview_image_url' = storage.objects.name
            )
          )
          or (
            coalesce(dm.message_type, '') = 'locked_album'
            and exists (
              select 1
              from jsonb_array_elements(
                case
                  when jsonb_typeof(dm.file_payload->'locked_items') = 'array' then dm.file_payload->'locked_items'
                  else '[]'::jsonb
                end
              ) as locked_item(item)
              where locked_item.item->>'preview_path' = storage.objects.name
            )
          )
          or (
            coalesce(dm.message_type, '') in ('locked_image', 'locked_video')
            and (dm.image_url = storage.objects.name or dm.video_url = storage.objects.name)
            and (
              dm.sender_id = (select auth.uid())
              or exists (
                select 1
                from public.direct_message_unlocks dmu
                where dmu.message_id = dm.id
                  and dmu.unlocker_id = (select auth.uid())
              )
            )
          )
          or (
            coalesce(dm.message_type, '') = 'locked_album'
            and exists (
              select 1
              from jsonb_array_elements(
                case
                  when jsonb_typeof(dm.file_payload->'locked_items') = 'array' then dm.file_payload->'locked_items'
                  else '[]'::jsonb
                end
              ) as locked_item(item)
              where locked_item.item->>'original_path' = storage.objects.name
            )
            and (
              dm.sender_id = (select auth.uid())
              or exists (
                select 1
                from public.direct_message_unlocks dmu
                where dmu.message_id = dm.id
                  and dmu.unlocker_id = (select auth.uid())
              )
            )
          )
        )
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
