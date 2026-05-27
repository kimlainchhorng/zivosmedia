
CREATE TABLE IF NOT EXISTS public.social_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL, title TEXT NOT NULL, description TEXT, cover_image_url TEXT,
  location TEXT, location_lat NUMERIC, location_lng NUMERIC, is_online BOOLEAN DEFAULT false,
  online_url TEXT, start_time TIMESTAMPTZ NOT NULL DEFAULT now(), end_time TIMESTAMPTZ, timezone TEXT DEFAULT 'UTC',
  capacity INTEGER, attendee_count INTEGER DEFAULT 0, ticket_price_cents INTEGER DEFAULT 0,
  currency TEXT DEFAULT 'USD', is_free BOOLEAN DEFAULT true, category TEXT, tags TEXT[],
  status TEXT DEFAULT 'upcoming', visibility TEXT DEFAULT 'public', allow_guests BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.social_events ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ev_sel" ON public.social_events FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ev_ins" ON public.social_events FOR INSERT WITH CHECK (auth.uid() = host_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ev_upd" ON public.social_events FOR UPDATE USING (auth.uid() = host_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ev_del" ON public.social_events FOR DELETE USING (auth.uid() = host_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.social_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, status TEXT DEFAULT 'going', ticket_id TEXT,
  checked_in_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(event_id, user_id)
);
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ea_sel" ON public.event_attendees FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ea_ins" ON public.event_attendees FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ea_upd" ON public.event_attendees FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ea_del" ON public.event_attendees FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.social_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, content TEXT NOT NULL,
  parent_id UUID REFERENCES public.event_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ec_sel" ON public.event_comments FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ec_ins" ON public.event_comments FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ec_del" ON public.event_comments FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.event_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.social_events(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL, invitee_id UUID NOT NULL, status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(event_id, invitee_id)
);
ALTER TABLE public.event_invites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ei_sel" ON public.event_invites FOR SELECT USING (auth.uid() = invitee_id OR auth.uid() = inviter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ei_ins" ON public.event_invites FOR INSERT WITH CHECK (auth.uid() = inviter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ei_upd" ON public.event_invites FOR UPDATE USING (auth.uid() = invitee_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Community members first (no FK yet), then communities, then add FK
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL, user_id UUID NOT NULL, role TEXT DEFAULT 'member',
  is_muted BOOLEAN DEFAULT false, joined_at TIMESTAMPTZ DEFAULT now(), UNIQUE(community_id, user_id)
);
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cm_sel" ON public.community_members FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cm_ins" ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cm_upd" ON public.community_members FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cm_del" ON public.community_members FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, slug TEXT UNIQUE, description TEXT, avatar_url TEXT, banner_url TEXT,
  category TEXT, rules JSONB DEFAULT '[]', member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0, privacy TEXT DEFAULT 'public', is_verified BOOLEAN DEFAULT false,
  created_by UUID NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

-- Add FK now
DO $$ BEGIN
  ALTER TABLE public.community_members ADD CONSTRAINT fk_cm_community FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE POLICY "co_sel" ON public.communities FOR SELECT USING (
  privacy = 'public' OR EXISTS (SELECT 1 FROM public.community_members WHERE community_id = id AND user_id = auth.uid())
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "co_ins" ON public.communities FOR INSERT WITH CHECK (auth.uid() = created_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "co_upd" ON public.communities FOR UPDATE USING (auth.uid() = created_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, title TEXT, content TEXT NOT NULL, media_urls JSONB DEFAULT '[]',
  post_type TEXT DEFAULT 'discussion', likes_count INTEGER DEFAULT 0, comments_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false, is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cp_sel" ON public.community_posts FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cp_ins" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cp_upd" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cp_del" ON public.community_posts FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.community_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  rule_number INTEGER NOT NULL, title TEXT NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.community_rules ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cr_sel" ON public.community_rules FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cr_ins" ON public.community_rules FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.communities WHERE id = community_id AND created_by = auth.uid())
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.community_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, banned_by UUID NOT NULL, reason TEXT, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(community_id, user_id)
);
ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cb_sel" ON public.community_bans FOR SELECT USING (auth.uid() = user_id OR auth.uid() = banned_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cb_ins" ON public.community_bans FOR INSERT WITH CHECK (auth.uid() = banned_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT, category TEXT, icon TEXT, sort_order INTEGER DEFAULT 0,
  thread_count INTEGER DEFAULT 0, last_post_at TIMESTAMPTZ, is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "fo_sel" ON public.forums FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "fo_ins" ON public.forums FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.forum_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID NOT NULL REFERENCES public.forums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false, is_locked BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0, replies_count INTEGER DEFAULT 0, last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.forum_threads ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ft_sel" ON public.forum_threads FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ft_ins" ON public.forum_threads FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ft_upd" ON public.forum_threads FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, description TEXT, avatar_url TEXT, category TEXT, interest TEXT,
  member_count INTEGER DEFAULT 0, max_members INTEGER, privacy TEXT DEFAULT 'public',
  created_by UUID NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cl_sel" ON public.clubs FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cl_ins" ON public.clubs FOR INSERT WITH CHECK (auth.uid() = created_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cl_upd" ON public.clubs FOR UPDATE USING (auth.uid() = created_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, role TEXT DEFAULT 'member', joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, user_id)
);
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "clm_sel" ON public.club_members FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "clm_ins" ON public.club_members FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "clm_del" ON public.club_members FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
