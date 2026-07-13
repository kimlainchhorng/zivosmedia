
-- Add reply threading and voice message support to direct_messages
ALTER TABLE public.direct_messages 
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.direct_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS voice_url TEXT;

-- Create group chat tables
CREATE TABLE public.chat_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.chat_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  voice_url TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  reply_to_id UUID REFERENCES public.group_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- RLS: chat_groups — members can view
CREATE POLICY "Members can view groups" ON public.chat_groups FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = id AND user_id = auth.uid()));

CREATE POLICY "Authenticated users can create groups" ON public.chat_groups FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creator can update group" ON public.chat_groups FOR UPDATE TO authenticated
USING (auth.uid() = created_by);

-- RLS: chat_group_members
CREATE POLICY "Members can view members" ON public.chat_group_members FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.chat_group_members cgm WHERE cgm.group_id = chat_group_members.group_id AND cgm.user_id = auth.uid()));

CREATE POLICY "Authenticated users can add members" ON public.chat_group_members FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Members can leave" ON public.chat_group_members FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- RLS: group_messages — members can view and send
CREATE POLICY "Members can view group messages" ON public.group_messages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

CREATE POLICY "Members can send group messages" ON public.group_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid()));

CREATE POLICY "Sender can delete group messages" ON public.group_messages FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

-- Indexes
CREATE INDEX idx_group_messages_group ON public.group_messages(group_id, created_at);
CREATE INDEX idx_chat_group_members_user ON public.chat_group_members(user_id);
CREATE INDEX idx_dm_reply ON public.direct_messages(reply_to_id);
