-- Keep Supabase Storage policy expressions compatible with Storage's schema
-- validator by moving locked album item JSON iteration into a simple helper.

create or replace function private.locked_album_item_path_exists(
  p_file_payload jsonb,
  p_key text,
  p_path text
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from jsonb_array_elements(
      case
        when jsonb_typeof(coalesce(p_file_payload, '{}'::jsonb)->'locked_items') = 'array'
          then coalesce(p_file_payload, '{}'::jsonb)->'locked_items'
        else '[]'::jsonb
      end
    ) as locked_item(item)
    where locked_item.item->>p_key = p_path
  );
$$;

revoke all on function private.locked_album_item_path_exists(jsonb, text, text) from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
grant execute on function private.locked_album_item_path_exists(jsonb, text, text) to authenticated, service_role;

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
            and private.locked_album_item_path_exists(gm.file_payload, 'preview_path', storage.objects.name)
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
            and private.locked_album_item_path_exists(gm.file_payload, 'original_path', storage.objects.name)
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
