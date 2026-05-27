
-- ===================== REELS SYSTEM =====================

CREATE TABLE IF NOT EXISTS public.reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  duration_seconds NUMERIC,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  audio_id UUID,
  filter_name TEXT,
  speed NUMERIC DEFAULT 1.0,
  is_duet BOOLEAN DEFAULT false,
  duet_reel_id UUID,
  is_stitch BOOLEAN DEFAULT false,
  stitch_reel_id UUID,
  is_published BOOLEAN DEFAULT true,
  visibility TEXT DEFAULT 'public',
  allow_comments BOOLEAN DEFAULT true,
  allow_duets BOOLEAN DEFAULT true,
  allow_stitches BOOLEAN DEFAULT true,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reels publicly readable" ON public.reels FOR SELECT USING (true);
CREATE POLICY "Users create own reels" ON public.reels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reels" ON public.reels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reels" ON public.reels FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_reels_user ON public.reels(user_id);
CREATE INDEX idx_reels_created ON public.reels(created_at DESC);
CREATE INDEX idx_reels_views ON public.reels(views_count DESC);

CREATE TABLE IF NOT EXISTS public.reel_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.reel_comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reel comments publicly readable" ON public.reel_comments FOR SELECT USING (true);
CREATE POLICY "Users create own reel comments" ON public.reel_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reel comments" ON public.reel_comments FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_reel_comments_reel ON public.reel_comments(reel_id);

CREATE TABLE IF NOT EXISTS public.reel_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reel_id, user_id)
);
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reel likes publicly readable" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "Users like reels" ON public.reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike reels" ON public.reel_likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reel_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reel_id, user_id)
);
ALTER TABLE public.reel_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own reel saves" ON public.reel_saves FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users save reels" ON public.reel_saves FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unsave reels" ON public.reel_saves FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reel_sounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  artist TEXT,
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  duration_seconds NUMERIC,
  usage_count INTEGER DEFAULT 0,
  is_trending BOOLEAN DEFAULT false,
  is_original BOOLEAN DEFAULT false,
  original_reel_id UUID,
  genre TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.reel_sounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sounds publicly readable" ON public.reel_sounds FOR SELECT USING (true);
CREATE POLICY "Authenticated users add sounds" ON public.reel_sounds FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.reel_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  preview_url TEXT,
  category TEXT DEFAULT 'filter',
  description TEXT,
  is_premium BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.reel_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Effects publicly readable" ON public.reel_effects FOR SELECT USING (true);
CREATE POLICY "Authenticated users add effects" ON public.reel_effects FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===================== SOCIAL FEATURES =====================

CREATE TABLE IF NOT EXISTS public.close_friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, friend_id)
);
ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own close friends" ON public.close_friends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add close friends" ON public.close_friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove close friends" ON public.close_friends FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  interest TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  weight NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, interest)
);
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own interests" ON public.user_interests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add interests" ON public.user_interests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update interests" ON public.user_interests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users remove interests" ON public.user_interests FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.content_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id TEXT NOT NULL,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.content_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own flags" ON public.content_flags FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users create flags" ON public.content_flags FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE TABLE IF NOT EXISTS public.link_previews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  domain TEXT,
  favicon_url TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days')
);
ALTER TABLE public.link_previews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Link previews publicly readable" ON public.link_previews FOR SELECT USING (true);
CREATE POLICY "Authenticated users cache previews" ON public.link_previews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.user_search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  result_type TEXT DEFAULT 'all',
  searched_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own search history" ON public.user_search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add search history" ON public.user_search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users clear search history" ON public.user_search_history FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_search_history_user ON public.user_search_history(user_id, searched_at DESC);

CREATE TABLE IF NOT EXISTS public.trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  category TEXT,
  post_count INTEGER DEFAULT 0,
  reel_count INTEGER DEFAULT 0,
  score NUMERIC DEFAULT 0,
  period TEXT DEFAULT 'daily',
  region TEXT,
  started_trending_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trending publicly readable" ON public.trending_topics FOR SELECT USING (true);
CREATE POLICY "Authenticated users add trending" ON public.trending_topics FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===================== CHAT EXTRAS =====================

CREATE TABLE IF NOT EXISTS public.chat_wallpapers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id TEXT,
  wallpaper_url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.chat_wallpapers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own wallpapers" ON public.chat_wallpapers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users set wallpapers" ON public.chat_wallpapers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update wallpapers" ON public.chat_wallpapers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete wallpapers" ON public.chat_wallpapers FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.chat_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  primary_color TEXT,
  secondary_color TEXT,
  bubble_color TEXT,
  text_color TEXT,
  background_color TEXT,
  preview_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.chat_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Themes publicly readable" ON public.chat_themes FOR SELECT USING (true);
CREATE POLICY "Authenticated users add themes" ON public.chat_themes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.message_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  source_language TEXT,
  target_language TEXT NOT NULL,
  translated_text TEXT NOT NULL,
  confidence NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, target_language)
);
ALTER TABLE public.message_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users see translations" ON public.message_translations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users create translations" ON public.message_translations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.disappearing_message_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 86400,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
ALTER TABLE public.disappearing_message_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own disappearing settings" ON public.disappearing_message_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create disappearing settings" ON public.disappearing_message_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update disappearing settings" ON public.disappearing_message_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds NUMERIC,
  waveform_data JSONB,
  is_listened BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users see voice notes" ON public.voice_notes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users create voice notes" ON public.voice_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own voice notes" ON public.voice_notes FOR DELETE USING (auth.uid() = user_id);

-- ===================== ACCOUNT EXTRAS =====================

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_info TEXT,
  device_type TEXT,
  os TEXT,
  browser TEXT,
  ip_address TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  last_active_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create sessions" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.user_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.user_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id, is_active);

CREATE TABLE IF NOT EXISTS public.archived_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id TEXT NOT NULL,
  archived_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);
ALTER TABLE public.archived_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own archived chats" ON public.archived_chats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users archive chats" ON public.archived_chats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unarchive chats" ON public.archived_chats FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  viewer_id UUID,
  viewed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profile owners see their views" ON public.profile_views FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Authenticated users record views" ON public.profile_views FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX idx_profile_views_profile ON public.profile_views(profile_id, viewed_at DESC);
