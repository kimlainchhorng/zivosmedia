-- Group chat polish: admin-only message pinning and private group avatars.

-- Pin/unpin is the only client-side UPDATE currently supported for group messages.
-- Restrict authenticated users to that column, then let RLS decide which rows.
REVOKE UPDATE ON TABLE public.group_messages FROM authenticated;
GRANT UPDATE (is_pinned) ON TABLE public.group_messages TO authenticated;

DROP POLICY IF EXISTS "Admins can pin group messages" ON public.group_messages;
CREATE POLICY "Admins can pin group messages"
ON public.group_messages
FOR UPDATE
TO authenticated
USING (public.is_group_admin((SELECT auth.uid()), group_id))
WITH CHECK (public.is_group_admin((SELECT auth.uid()), group_id));

-- The private chat-media-files bucket now stores group avatar paths in
-- chat_groups.avatar_url. Group members need read access to those objects,
-- and the existing group media branch must reference chat_group_members.
DROP POLICY IF EXISTS "chat_media_select_owner_or_recipient" ON storage.objects;
CREATE POLICY "chat_media_select_owner_or_recipient"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN ('chat-media-files', 'chat_uploads')
  AND (
    (SELECT auth.uid())::text = split_part(storage.objects.name, '/', 1)
    OR EXISTS (
      SELECT 1
      FROM public.direct_messages dm
      WHERE (dm.image_url = storage.objects.name OR dm.video_url = storage.objects.name OR dm.voice_url = storage.objects.name)
        AND (dm.sender_id = (SELECT auth.uid()) OR dm.receiver_id = (SELECT auth.uid()))
    )
    OR EXISTS (
      SELECT 1
      FROM public.group_messages gm
      JOIN public.chat_group_members cgm ON cgm.group_id = gm.group_id
      WHERE (gm.image_url = storage.objects.name OR gm.video_url = storage.objects.name OR gm.voice_url = storage.objects.name)
        AND cgm.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.chat_groups cg
      JOIN public.chat_group_members cgm ON cgm.group_id = cg.id
      WHERE cgm.user_id = (SELECT auth.uid())
        AND (
          cg.avatar_url = storage.objects.name
          OR cg.avatar_url LIKE '%/storage/v1/object/public/chat-media-files/' || storage.objects.name
        )
    )
  )
);
