
-- Poll posts
CREATE TABLE IF NOT EXISTS public.poll_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  poll_type TEXT DEFAULT 'poll', -- 'poll' or 'quiz'
  options JSONB NOT NULL DEFAULT '[]',
  correct_option_index INT, -- for quiz type
  expires_at TIMESTAMP WITH TIME ZONE,
  total_votes INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.poll_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view polls" ON public.poll_posts FOR SELECT USING (true);
CREATE POLICY "Users create own polls" ON public.poll_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own polls" ON public.poll_posts FOR DELETE USING (auth.uid() = user_id);

-- Poll votes
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.poll_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view votes" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Users cast own votes" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Post drafts & scheduling
CREATE TABLE IF NOT EXISTS public.post_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  caption TEXT,
  media_urls JSONB DEFAULT '[]',
  media_type TEXT DEFAULT 'image',
  filter_css TEXT,
  tags JSONB DEFAULT '[]',
  location_name TEXT,
  publish_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'published'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.post_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own drafts" ON public.post_drafts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Post collaborators
CREATE TABLE IF NOT EXISTS public.post_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.post_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collaborators can view" ON public.post_collaborators FOR SELECT USING (true);
CREATE POLICY "Users manage own collabs" ON public.post_collaborators FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Story highlights
CREATE TABLE IF NOT EXISTS public.story_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  cover_url TEXT,
  story_ids JSONB DEFAULT '[]',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view highlights" ON public.story_highlights FOR SELECT USING (true);
CREATE POLICY "Users manage own highlights" ON public.story_highlights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat polls
CREATE TABLE IF NOT EXISTS public.chat_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id TEXT NOT NULL,
  creator_id UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  is_anonymous BOOLEAN DEFAULT false,
  allows_multiple BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chat polls" ON public.chat_polls FOR SELECT USING (true);
CREATE POLICY "Users create chat polls" ON public.chat_polls FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Chat poll votes
CREATE TABLE IF NOT EXISTS public.chat_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.chat_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);
ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chat poll votes" ON public.chat_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users cast chat poll votes" ON public.chat_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Chat folders
CREATE TABLE IF NOT EXISTS public.chat_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own folders" ON public.chat_folders FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Chat folder members
CREATE TABLE IF NOT EXISTS public.chat_folder_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.chat_folders(id) ON DELETE CASCADE,
  conversation_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(folder_id, conversation_id)
);
ALTER TABLE public.chat_folder_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own folder members" ON public.chat_folder_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.chat_folders WHERE id = folder_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_folders WHERE id = folder_id AND user_id = auth.uid()));

-- Verification requests
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  category TEXT DEFAULT 'personal', -- 'personal', 'business', 'creator'
  document_url TEXT,
  additional_info TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own requests" ON public.verification_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create requests" ON public.verification_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Account activity log
CREATE TABLE IF NOT EXISTS public.account_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  device_info TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.account_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own activity" ON public.account_activity_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own activity" ON public.account_activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);
