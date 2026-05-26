-- Chat super-app features (applied via Supabase MCP 2026-05-05).
-- Note: pinned_messages already existed with conversation_id pattern;
-- this migration extends it with expires_at + message_table columns
-- rather than introducing a parallel chat_kind/chat_key model.

-- pinned_messages — extend existing
ALTER TABLE public.pinned_messages ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.pinned_messages ADD COLUMN IF NOT EXISTS message_table TEXT;
CREATE INDEX IF NOT EXISTS idx_pinned_messages_lookup ON public.pinned_messages(conversation_id, pinned_at DESC);

-- reply_to columns for quote-reply
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID,
  ADD COLUMN IF NOT EXISTS reply_to_snapshot JSONB;
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID,
  ADD COLUMN IF NOT EXISTS reply_to_snapshot JSONB;

-- group_message_reads
CREATE TABLE IF NOT EXISTS public.group_message_reads (
  message_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_group_message_reads_message ON public.group_message_reads(message_id);
ALTER TABLE public.group_message_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members can record their own read" ON public.group_message_reads;
CREATE POLICY "Members can record their own read" ON public.group_message_reads FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Members can read receipts in their groups" ON public.group_message_reads;
CREATE POLICY "Members can read receipts in their groups" ON public.group_message_reads FOR SELECT USING (auth.uid() IS NOT NULL);

-- group_polls + group_poll_votes
CREATE TABLE IF NOT EXISTS public.group_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  message_id UUID,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  multi_select BOOLEAN NOT NULL DEFAULT false,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_polls_group ON public.group_polls(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.group_poll_votes (
  poll_id UUID NOT NULL REFERENCES public.group_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id, option_id)
);

ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read group polls" ON public.group_polls;
CREATE POLICY "Members can read group polls" ON public.group_polls FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_group_members m WHERE m.group_id = group_polls.group_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Members can create polls in their groups" ON public.group_polls;
CREATE POLICY "Members can create polls in their groups" ON public.group_polls FOR INSERT WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (SELECT 1 FROM public.chat_group_members m WHERE m.group_id = group_polls.group_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Members can read votes" ON public.group_poll_votes;
CREATE POLICY "Members can read votes" ON public.group_poll_votes FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Members can vote" ON public.group_poll_votes;
CREATE POLICY "Members can vote" ON public.group_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Members can change their vote" ON public.group_poll_votes;
CREATE POLICY "Members can change their vote" ON public.group_poll_votes FOR DELETE USING (auth.uid() = user_id);

-- live_locations — temporary geo-sharing
CREATE TABLE IF NOT EXISTS public.live_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_kind TEXT NOT NULL CHECK (chat_kind IN ('direct', 'group')),
  chat_key TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy_m NUMERIC,
  expires_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, chat_kind, chat_key)
);
CREATE INDEX IF NOT EXISTS idx_live_locations_active ON public.live_locations(chat_kind, chat_key, expires_at);
ALTER TABLE public.live_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read live locations in chats theyre in" ON public.live_locations;
CREATE POLICY "Users can read live locations in chats theyre in" ON public.live_locations FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can publish their own location" ON public.live_locations;
CREATE POLICY "Users can publish their own location" ON public.live_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update their own location" ON public.live_locations;
CREATE POLICY "Users can update their own location" ON public.live_locations FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can stop sharing their own location" ON public.live_locations;
CREATE POLICY "Users can stop sharing their own location" ON public.live_locations FOR DELETE USING (auth.uid() = user_id);
