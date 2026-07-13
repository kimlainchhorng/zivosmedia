-- Fix infinite recursion on chat_group_members and chat_groups RLS by removing
-- legacy policies that query the same table from inside the policy. We rely
-- on SECURITY DEFINER helper functions (is_group_member / is_group_admin /
-- is_group_owner) instead.

-- chat_group_members: drop recursive / legacy policies
DROP POLICY IF EXISTS "Group members or creator can add members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Members can view members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Members see group members" ON public.chat_group_members;
DROP POLICY IF EXISTS "Users join groups" ON public.chat_group_members;
DROP POLICY IF EXISTS "Users update own membership" ON public.chat_group_members;
DROP POLICY IF EXISTS "Users leave groups" ON public.chat_group_members;
DROP POLICY IF EXISTS "Members can leave" ON public.chat_group_members;

-- chat_groups: drop legacy / duplicate policies (the recursive SELECT one is the worst)
DROP POLICY IF EXISTS "Group members can view groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Members can view groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Authenticated users create groups" ON public.chat_groups;
DROP POLICY IF EXISTS "Creator can update group" ON public.chat_groups;
DROP POLICY IF EXISTS "Creators update groups" ON public.chat_groups;

-- Re-assert clean, non-recursive policies via helper functions.
DROP POLICY IF EXISTS "Members can view their groups" ON public.chat_groups;
CREATE POLICY "Members can view their groups" ON public.chat_groups
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), id) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated can create groups" ON public.chat_groups;
CREATE POLICY "Authenticated can create groups" ON public.chat_groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Members view fellow members" ON public.chat_group_members;
CREATE POLICY "Members view fellow members" ON public.chat_group_members
  FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

DROP POLICY IF EXISTS "Self can join group" ON public.chat_group_members;
CREATE POLICY "Self can join group" ON public.chat_group_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow group creator to add other members during initial creation, and admins
-- afterwards. Uses helper functions to avoid recursion.
DROP POLICY IF EXISTS "Admins can add members" ON public.chat_group_members;
CREATE POLICY "Admins can add members" ON public.chat_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_group_admin(auth.uid(), group_id)
    OR EXISTS (
      SELECT 1 FROM public.chat_groups g
      WHERE g.id = chat_group_members.group_id AND g.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can leave or admins can kick" ON public.chat_group_members;
CREATE POLICY "Members can leave or admins can kick" ON public.chat_group_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (public.is_group_admin(auth.uid(), group_id) AND role <> 'owner')
  );
