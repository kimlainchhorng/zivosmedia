
CREATE TABLE IF NOT EXISTS public.social_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]', poll_type TEXT DEFAULT 'single',
  total_votes INTEGER DEFAULT 0, expires_at TIMESTAMPTZ,
  is_anonymous BOOLEAN DEFAULT false, show_results TEXT DEFAULT 'after_vote',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.social_polls ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "sp_sel" ON public.social_polls FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "sp_ins" ON public.social_polls FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "sp_del" ON public.social_polls FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.social_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.social_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(poll_id, user_id)
);
ALTER TABLE public.social_poll_votes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "spv_sel" ON public.social_poll_votes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "spv_ins" ON public.social_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ama_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL, title TEXT NOT NULL, description TEXT,
  topic TEXT, cover_url TEXT, status TEXT DEFAULT 'upcoming',
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ,
  question_count INTEGER DEFAULT 0, viewer_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ama_sessions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ama_sel" ON public.ama_sessions FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ama_ins" ON public.ama_sessions FOR INSERT WITH CHECK (auth.uid() = host_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ama_upd" ON public.ama_sessions FOR UPDATE USING (auth.uid() = host_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ama_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ama_id UUID NOT NULL REFERENCES public.ama_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, question TEXT NOT NULL,
  answer TEXT, is_answered BOOLEAN DEFAULT false,
  upvotes INTEGER DEFAULT 0, is_anonymous BOOLEAN DEFAULT false,
  answered_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ama_questions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "amaq_sel" ON public.ama_questions FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "amaq_ins" ON public.ama_questions FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL, title TEXT NOT NULL, description TEXT,
  rules TEXT, cover_url TEXT, hashtag TEXT,
  challenge_type TEXT DEFAULT 'content', prize_description TEXT,
  prize_value_cents INTEGER DEFAULT 0, max_participants INTEGER,
  participant_count INTEGER DEFAULT 0, submission_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ DEFAULT now(), ends_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active', is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ch_sel" ON public.challenges FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ch_ins" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ch_upd" ON public.challenges FOR UPDATE USING (auth.uid() = creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, status TEXT DEFAULT 'joined',
  joined_at TIMESTAMPTZ DEFAULT now(), UNIQUE(challenge_id, user_id)
);
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "chp_sel" ON public.challenge_participants FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "chp_ins" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "chp_del" ON public.challenge_participants FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, content_type TEXT DEFAULT 'reel',
  content_id TEXT, content_url TEXT, caption TEXT,
  votes_count INTEGER DEFAULT 0, rank INTEGER,
  is_winner BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "chs_sel" ON public.challenge_submissions FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "chs_ins" ON public.challenge_submissions FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, streak_type TEXT NOT NULL,
  current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE, started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, streak_type)
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "us_sel" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "us_ins" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "us_upd" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.reaction_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, creator_id UUID, preview_url TEXT,
  reactions JSONB DEFAULT '[]', is_premium BOOLEAN DEFAULT false,
  price_cents INTEGER DEFAULT 0, download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.reaction_packs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "rp_sel" ON public.reaction_packs FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "rp_ins" ON public.reaction_packs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.sticker_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, creator_id UUID, preview_url TEXT,
  category TEXT, is_premium BOOLEAN DEFAULT false,
  price_cents INTEGER DEFAULT 0, download_count INTEGER DEFAULT 0,
  sticker_count INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sticker_packs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "skp_sel" ON public.sticker_packs FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "skp_ins" ON public.sticker_packs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.sticker_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES public.sticker_packs(id) ON DELETE CASCADE,
  name TEXT, image_url TEXT NOT NULL, emoji_shortcode TEXT,
  sort_order INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sticker_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ski_sel" ON public.sticker_items FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.gif_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, gif_url TEXT NOT NULL,
  gif_id TEXT, source TEXT DEFAULT 'giphy',
  created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, gif_url)
);
ALTER TABLE public.gif_favorites ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "gf_sel" ON public.gif_favorites FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "gf_ins" ON public.gif_favorites FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "gf_del" ON public.gif_favorites FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
