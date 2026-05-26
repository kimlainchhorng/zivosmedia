
-- ===================== STORIES EXTENSIONS =====================

CREATE TABLE IF NOT EXISTS public.story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Story authors see views" ON public.story_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
  OR viewer_id = auth.uid()
);
CREATE POLICY "Users record own views" ON public.story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

CREATE TABLE IF NOT EXISTS public.story_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(story_id, user_id, emoji)
);
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reactions publicly readable" ON public.story_reactions FOR SELECT USING (true);
CREATE POLICY "Users create own reactions" ON public.story_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own reactions" ON public.story_reactions FOR DELETE USING (auth.uid() = user_id);

-- ===================== ENHANCED POSTS =====================

CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments publicly readable" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Users create own comments" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comments" ON public.post_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.post_comments(parent_id);

CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes publicly readable" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users create own likes" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own likes" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post ON public.post_likes(post_id);

CREATE TABLE IF NOT EXISTS public.post_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  shared_to TEXT DEFAULT 'feed',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shares publicly readable" ON public.post_shares FOR SELECT USING (true);
CREATE POLICY "Users create own shares" ON public.post_shares FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_shares_post ON public.post_shares(post_id);

CREATE TABLE IF NOT EXISTS public.post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  thumbnail_url TEXT,
  sort_order INTEGER DEFAULT 0,
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.post_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Media publicly readable" ON public.post_media FOR SELECT USING (true);
CREATE POLICY "Authenticated users insert media" ON public.post_media FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_media_post ON public.post_media(post_id);

CREATE TABLE IF NOT EXISTS public.hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hashtags publicly readable" ON public.hashtags FOR SELECT USING (true);
CREATE POLICY "Authenticated users create hashtags" ON public.hashtags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.post_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  UNIQUE(post_id, hashtag_id)
);
ALTER TABLE public.post_hashtags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Post hashtags publicly readable" ON public.post_hashtags FOR SELECT USING (true);
CREATE POLICY "Authenticated users link hashtags" ON public.post_hashtags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.post_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  mentioned_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, mentioned_user_id)
);
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mentions publicly readable" ON public.post_mentions FOR SELECT USING (true);
CREATE POLICY "Authenticated users create mentions" ON public.post_mentions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.post_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own reports" ON public.post_reports FOR SELECT USING (auth.uid() = reporter_id);
CREATE POLICY "Users create own reports" ON public.post_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ===================== ADVANCED CHAT =====================

CREATE TABLE IF NOT EXISTS public.chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 256,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.chat_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  is_muted BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  nickname TEXT,
  joined_at TIMESTAMPTZ DEFAULT now(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;

-- Policies for chat_groups (need chat_group_members to exist first)
CREATE POLICY "Group members can view groups" ON public.chat_groups FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_group_members WHERE group_id = id AND user_id = auth.uid())
  OR created_by = auth.uid()
);
CREATE POLICY "Authenticated users create groups" ON public.chat_groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators update groups" ON public.chat_groups FOR UPDATE USING (auth.uid() = created_by);

-- Policies for chat_group_members
CREATE POLICY "Members see group members" ON public.chat_group_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_group_members cgm WHERE cgm.group_id = chat_group_members.group_id AND cgm.user_id = auth.uid())
);
CREATE POLICY "Users join groups" ON public.chat_group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own membership" ON public.chat_group_members FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users leave groups" ON public.chat_group_members FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL,
  reply_to_message_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.message_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users see replies" ON public.message_replies FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users create replies" ON public.message_replies FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  message_id UUID NOT NULL,
  pinned_by UUID NOT NULL,
  pinned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, message_id)
);
ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users see pins" ON public.pinned_messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users pin messages" ON public.pinned_messages FOR INSERT WITH CHECK (auth.uid() = pinned_by);
CREATE POLICY "Users unpin own pins" ON public.pinned_messages FOR DELETE USING (auth.uid() = pinned_by);

CREATE TABLE IF NOT EXISTS public.forwarded_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_message_id UUID NOT NULL,
  forwarded_by UUID NOT NULL,
  forwarded_to_conversation TEXT NOT NULL,
  forwarded_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.forwarded_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own forwards" ON public.forwarded_messages FOR SELECT USING (auth.uid() = forwarded_by);
CREATE POLICY "Users create forwards" ON public.forwarded_messages FOR INSERT WITH CHECK (auth.uid() = forwarded_by);

-- ===================== NOTIFICATIONS SYSTEM =====================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  entity_type TEXT,
  entity_id TEXT,
  image_url TEXT,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users create notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  likes BOOLEAN DEFAULT true,
  comments BOOLEAN DEFAULT true,
  follows BOOLEAN DEFAULT true,
  messages BOOLEAN DEFAULT true,
  stories BOOLEAN DEFAULT true,
  mentions BOOLEAN DEFAULT true,
  group_invites BOOLEAN DEFAULT true,
  post_from_following BOOLEAN DEFAULT false,
  marketing BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own prefs" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own prefs" ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- ===================== USER FOLLOWERS =====================

CREATE TABLE IF NOT EXISTS public.user_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE public.user_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Followers publicly readable" ON public.user_followers FOR SELECT USING (true);
CREATE POLICY "Users follow others" ON public.user_followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users unfollow" ON public.user_followers FOR DELETE USING (auth.uid() = follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON public.user_followers(following_id);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON public.user_followers(follower_id);

-- ===================== SAVED COLLECTIONS =====================

CREATE TABLE IF NOT EXISTS public.saved_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cover_url TEXT,
  is_private BOOLEAN DEFAULT true,
  item_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.saved_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own or public collections" ON public.saved_collections FOR SELECT USING (auth.uid() = user_id OR is_private = false);
CREATE POLICY "Users create own collections" ON public.saved_collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own collections" ON public.saved_collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own collections" ON public.saved_collections FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.saved_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.saved_collections(id) ON DELETE CASCADE,
  post_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(collection_id, post_id)
);
ALTER TABLE public.saved_collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own collection items" ON public.saved_collection_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.saved_collections WHERE id = collection_id AND (user_id = auth.uid() OR is_private = false))
);
CREATE POLICY "Users add to own collections" ON public.saved_collection_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.saved_collections WHERE id = collection_id AND user_id = auth.uid())
);
CREATE POLICY "Users remove from own collections" ON public.saved_collection_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.saved_collections WHERE id = collection_id AND user_id = auth.uid())
);
