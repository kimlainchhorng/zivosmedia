
-- Fix permissive INSERT policy on chat_group_members
DROP POLICY "Authenticated users can add members" ON public.chat_group_members;

CREATE POLICY "Group members or creator can add members" ON public.chat_group_members FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_group_members cgm WHERE cgm.group_id = chat_group_members.group_id AND cgm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.chat_groups cg WHERE cg.id = chat_group_members.group_id AND cg.created_by = auth.uid()
  )
);
