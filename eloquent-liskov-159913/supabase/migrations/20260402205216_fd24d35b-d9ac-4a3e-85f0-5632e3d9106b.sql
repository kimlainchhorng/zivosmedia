
-- Chat personalization columns on chat_settings
ALTER TABLE public.chat_settings 
  ADD COLUMN IF NOT EXISTS wallpaper TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS font_size TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS retention_days INTEGER DEFAULT 0;

-- Chat drafts for multi-device sync
CREATE TABLE public.chat_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_partner_id TEXT NOT NULL,
  draft_text TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, chat_partner_id)
);

ALTER TABLE public.chat_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own drafts" ON public.chat_drafts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat polls
CREATE TABLE public.chat_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_partner_id TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  votes JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_closed BOOLEAN DEFAULT false,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view polls" ON public.chat_polls
  FOR SELECT USING (
    auth.uid() = creator_id 
    OR chat_partner_id = auth.uid()::text
  );

CREATE POLICY "Users can create polls" ON public.chat_polls
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creator can update polls" ON public.chat_polls
  FOR UPDATE USING (auth.uid() = creator_id);

-- Chat todos
CREATE TABLE public.chat_todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_partner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_shared BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view todos" ON public.chat_todos
  FOR SELECT USING (
    auth.uid() = creator_id 
    OR chat_partner_id = auth.uid()::text
  );

CREATE POLICY "Users can create todos" ON public.chat_todos
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Participants can update todos" ON public.chat_todos
  FOR UPDATE USING (
    auth.uid() = creator_id 
    OR chat_partner_id = auth.uid()::text
  );

CREATE POLICY "Creator can delete todos" ON public.chat_todos
  FOR DELETE USING (auth.uid() = creator_id);

-- Chat split bills
CREATE TABLE public.chat_split_bills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_partner_id TEXT NOT NULL,
  title TEXT NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  splits JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_split_bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view bills" ON public.chat_split_bills
  FOR SELECT USING (
    auth.uid() = creator_id 
    OR chat_partner_id = auth.uid()::text
  );

CREATE POLICY "Users can create bills" ON public.chat_split_bills
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Participants can update bills" ON public.chat_split_bills
  FOR UPDATE USING (
    auth.uid() = creator_id 
    OR chat_partner_id = auth.uid()::text
  );

-- Blocked users
CREATE TABLE public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocks" ON public.blocked_users
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others" ON public.blocked_users
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock" ON public.blocked_users
  FOR DELETE USING (auth.uid() = blocker_id);

-- User reports
CREATE TABLE public.user_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports" ON public.user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
