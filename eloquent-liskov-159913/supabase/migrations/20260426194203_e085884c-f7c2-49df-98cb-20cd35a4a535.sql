-- Broadcast lists
CREATE TABLE IF NOT EXISTS public.broadcast_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_broadcast_lists_owner ON public.broadcast_lists(owner_id);
ALTER TABLE public.broadcast_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own broadcast lists"
  ON public.broadcast_lists FOR SELECT
  USING (auth.uid() = owner_id);
CREATE POLICY "Owners create broadcast lists"
  ON public.broadcast_lists FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners update broadcast lists"
  ON public.broadcast_lists FOR UPDATE
  USING (auth.uid() = owner_id);
CREATE POLICY "Owners delete broadcast lists"
  ON public.broadcast_lists FOR DELETE
  USING (auth.uid() = owner_id);

-- Broadcast list members
CREATE TABLE IF NOT EXISTS public.broadcast_list_members (
  list_id UUID NOT NULL REFERENCES public.broadcast_lists(id) ON DELETE CASCADE,
  member_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (list_id, member_id)
);
CREATE INDEX IF NOT EXISTS idx_broadcast_list_members_member ON public.broadcast_list_members(member_id);
ALTER TABLE public.broadcast_list_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "List owners view members"
  ON public.broadcast_list_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.broadcast_lists l WHERE l.id = list_id AND l.owner_id = auth.uid()));
CREATE POLICY "List owners add members"
  ON public.broadcast_list_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.broadcast_lists l WHERE l.id = list_id AND l.owner_id = auth.uid()));
CREATE POLICY "List owners remove members"
  ON public.broadcast_list_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.broadcast_lists l WHERE l.id = list_id AND l.owner_id = auth.uid()));

-- Gift payload on direct messages
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS gift_payload JSONB;
