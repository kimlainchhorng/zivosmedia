
-- Bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- 'post', 'flight', 'restaurant'
  item_id TEXT NOT NULL,
  collection_name TEXT DEFAULT 'All',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Blocked users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own blocks" ON public.blocked_users FOR ALL USING (auth.uid() = blocker_id) WITH CHECK (auth.uid() = blocker_id);

-- Muted conversations table
CREATE TABLE IF NOT EXISTS public.muted_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id TEXT NOT NULL,
  muted_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);
ALTER TABLE public.muted_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own mutes" ON public.muted_conversations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Message reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view message reactions" ON public.message_reactions FOR SELECT USING (true);
CREATE POLICY "Users manage own reactions" ON public.message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions" ON public.message_reactions FOR DELETE USING (auth.uid() = user_id);

-- Privacy settings table
CREATE TABLE IF NOT EXISTS public.privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  profile_visibility TEXT DEFAULT 'public', -- 'public', 'followers', 'private'
  show_activity_status BOOLEAN DEFAULT true,
  show_read_receipts BOOLEAN DEFAULT true,
  allow_message_requests BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own privacy settings" ON public.privacy_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own privacy" ON public.privacy_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
