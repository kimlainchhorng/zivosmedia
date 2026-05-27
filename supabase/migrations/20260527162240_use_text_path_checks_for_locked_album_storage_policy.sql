-- Supabase Storage's schema validator is conservative around JSONB helper
-- expressions in policies. Use simple text path checks for album items.

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
            and gm.file_payload::text like ('%"preview_path": "' || storage.objects.name || '"%')
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
            and gm.file_payload::text like ('%"original_path": "' || storage.objects.name || '"%')
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
