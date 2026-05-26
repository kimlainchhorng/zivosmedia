
-- MUSIC & AUDIO
CREATE TABLE IF NOT EXISTS public.playlists (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, title TEXT NOT NULL, description TEXT, cover_url TEXT, is_public BOOLEAN DEFAULT true, track_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "pl_sel" ON public.playlists FOR SELECT USING (is_public = true OR auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pl_ins" ON public.playlists FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pl_upd" ON public.playlists FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pl_del" ON public.playlists FOR DELETE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.playlist_items (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE, sound_id UUID, reel_id UUID, title TEXT, sort_order INTEGER DEFAULT 0, added_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "pli_sel" ON public.playlist_items FOR SELECT USING (EXISTS(SELECT 1 FROM public.playlists WHERE id=playlist_id AND (is_public=true OR user_id=auth.uid()))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pli_ins" ON public.playlist_items FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM public.playlists WHERE id=playlist_id AND user_id=auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pli_del" ON public.playlist_items FOR DELETE USING (EXISTS(SELECT 1 FROM public.playlists WHERE id=playlist_id AND user_id=auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.audio_rooms (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), host_id UUID NOT NULL, title TEXT NOT NULL, description TEXT, topic TEXT, cover_url TEXT, status TEXT DEFAULT 'live', max_speakers INTEGER DEFAULT 10, listener_count INTEGER DEFAULT 0, is_recording BOOLEAN DEFAULT false, started_at TIMESTAMPTZ DEFAULT now(), ended_at TIMESTAMPTZ);
ALTER TABLE public.audio_rooms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ar2_sel" ON public.audio_rooms FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ar2_ins" ON public.audio_rooms FOR INSERT WITH CHECK (auth.uid()=host_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ar2_upd" ON public.audio_rooms FOR UPDATE USING (auth.uid()=host_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.audio_room_participants (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), room_id UUID NOT NULL REFERENCES public.audio_rooms(id) ON DELETE CASCADE, user_id UUID NOT NULL, role TEXT DEFAULT 'listener', is_muted BOOLEAN DEFAULT true, joined_at TIMESTAMPTZ DEFAULT now(), left_at TIMESTAMPTZ, UNIQUE(room_id, user_id));
ALTER TABLE public.audio_room_participants ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "arp_sel" ON public.audio_room_participants FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "arp_ins" ON public.audio_room_participants FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "arp_upd" ON public.audio_room_participants FOR UPDATE USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.podcasts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), creator_id UUID NOT NULL, title TEXT NOT NULL, description TEXT, cover_url TEXT, category TEXT, language TEXT DEFAULT 'en', subscriber_count INTEGER DEFAULT 0, episode_count INTEGER DEFAULT 0, is_active BOOLEAN DEFAULT true, rss_url TEXT, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "pod_sel" ON public.podcasts FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pod_ins" ON public.podcasts FOR INSERT WITH CHECK (auth.uid()=creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pod_upd" ON public.podcasts FOR UPDATE USING (auth.uid()=creator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.podcast_episodes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT, audio_url TEXT NOT NULL, duration_seconds INTEGER, episode_number INTEGER, season_number INTEGER DEFAULT 1, play_count INTEGER DEFAULT 0, is_published BOOLEAN DEFAULT true, published_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.podcast_episodes ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "pe_sel" ON public.podcast_episodes FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "pe_ins" ON public.podcast_episodes FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM public.podcasts WHERE id=podcast_id AND creator_id=auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.podcast_subscriptions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), podcast_id UUID NOT NULL REFERENCES public.podcasts(id) ON DELETE CASCADE, user_id UUID NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(podcast_id, user_id));
ALTER TABLE public.podcast_subscriptions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ps_sel" ON public.podcast_subscriptions FOR SELECT USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ps_ins" ON public.podcast_subscriptions FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ps_del" ON public.podcast_subscriptions FOR DELETE USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- GAMING
CREATE TABLE IF NOT EXISTS public.mini_games (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, icon_url TEXT, category TEXT, max_players INTEGER DEFAULT 1, is_multiplayer BOOLEAN DEFAULT false, is_active BOOLEAN DEFAULT true, play_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.mini_games ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "mg_sel" ON public.mini_games FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.game_scores (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), game_id UUID NOT NULL REFERENCES public.mini_games(id) ON DELETE CASCADE, user_id UUID NOT NULL, score INTEGER NOT NULL, level INTEGER, metadata JSONB, played_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "gs_sel" ON public.game_scores FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "gs_ins" ON public.game_scores FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.leaderboards (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, type TEXT DEFAULT 'global', game_id UUID REFERENCES public.mini_games(id), period TEXT DEFAULT 'alltime', reset_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "lb_sel" ON public.leaderboards FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.leaderboard_entries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), leaderboard_id UUID NOT NULL REFERENCES public.leaderboards(id) ON DELETE CASCADE, user_id UUID NOT NULL, score INTEGER NOT NULL, rank INTEGER, updated_at TIMESTAMPTZ DEFAULT now(), UNIQUE(leaderboard_id, user_id));
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "lbe_sel" ON public.leaderboard_entries FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "lbe_ins" ON public.leaderboard_entries FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "lbe_upd" ON public.leaderboard_entries FOR UPDATE USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- LOCATION & TRAVEL
CREATE TABLE IF NOT EXISTS public.places (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, category TEXT, address TEXT, lat NUMERIC, lng NUMERIC, cover_url TEXT, rating NUMERIC DEFAULT 0, review_count INTEGER DEFAULT 0, is_verified BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "plc_sel" ON public.places FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "plc_ins" ON public.places FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.check_ins (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, place_id UUID REFERENCES public.places(id), location_name TEXT, lat NUMERIC, lng NUMERIC, caption TEXT, photo_url TEXT, is_public BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ci_sel" ON public.check_ins FOR SELECT USING (is_public=true OR auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ci_ins" ON public.check_ins FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.travel_journals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, title TEXT NOT NULL, description TEXT, cover_url TEXT, destination TEXT, start_date DATE, end_date DATE, is_public BOOLEAN DEFAULT true, entry_count INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.travel_journals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "tj_sel" ON public.travel_journals FOR SELECT USING (is_public=true OR auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tj_ins" ON public.travel_journals FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "tj_upd" ON public.travel_journals FOR UPDATE USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.journal_entries (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), journal_id UUID NOT NULL REFERENCES public.travel_journals(id) ON DELETE CASCADE, content TEXT, media_urls JSONB DEFAULT '[]', location_name TEXT, lat NUMERIC, lng NUMERIC, mood TEXT, weather TEXT, entry_date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "je_sel" ON public.journal_entries FOR SELECT USING (EXISTS(SELECT 1 FROM public.travel_journals WHERE id=journal_id AND (is_public=true OR user_id=auth.uid()))); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "je_ins" ON public.journal_entries FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM public.travel_journals WHERE id=journal_id AND user_id=auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.location_shares (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, shared_with UUID NOT NULL, lat NUMERIC, lng NUMERIC, expires_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ls_sel" ON public.location_shares FOR SELECT USING (auth.uid()=user_id OR auth.uid()=shared_with); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ls_ins" ON public.location_shares FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ls_upd" ON public.location_shares FOR UPDATE USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ls_del" ON public.location_shares FOR DELETE USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- PLATFORM FEATURES
CREATE TABLE IF NOT EXISTS public.feature_flags (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL UNIQUE, description TEXT, is_enabled BOOLEAN DEFAULT false, rollout_percentage INTEGER DEFAULT 0, target_users JSONB, target_roles TEXT[], created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ff_sel" ON public.feature_flags FOR SELECT USING (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ab_tests (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT NOT NULL, description TEXT, variants JSONB NOT NULL DEFAULT '[]', status TEXT DEFAULT 'draft', traffic_percentage INTEGER DEFAULT 100, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, winner_variant TEXT, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ab_sel" ON public.ab_tests FOR SELECT USING (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ab_test_assignments (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), test_id UUID NOT NULL REFERENCES public.ab_tests(id) ON DELETE CASCADE, user_id UUID NOT NULL, variant TEXT NOT NULL, converted BOOLEAN DEFAULT false, converted_at TIMESTAMPTZ, assigned_at TIMESTAMPTZ DEFAULT now(), UNIQUE(test_id, user_id));
ALTER TABLE public.ab_test_assignments ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "aba_sel" ON public.ab_test_assignments FOR SELECT USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "aba_ins" ON public.ab_test_assignments FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.waitlists (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), feature TEXT NOT NULL, user_id UUID NOT NULL, email TEXT, position INTEGER, status TEXT DEFAULT 'waiting', invited_at TIMESTAMPTZ, joined_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now(), UNIQUE(feature, user_id));
ALTER TABLE public.waitlists ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "wl_sel" ON public.waitlists FOR SELECT USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "wl_ins" ON public.waitlists FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_referrals (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), referrer_id UUID NOT NULL, referred_id UUID, referral_code TEXT NOT NULL, status TEXT DEFAULT 'pending', reward_type TEXT, reward_value INTEGER, rewarded_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.user_referrals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ur_sel" ON public.user_referrals FOR SELECT USING (auth.uid()=referrer_id OR auth.uid()=referred_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ur_ins" ON public.user_referrals FOR INSERT WITH CHECK (auth.uid()=referrer_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.feedback_submissions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID, category TEXT DEFAULT 'general', subject TEXT, message TEXT NOT NULL, rating INTEGER, screenshot_url TEXT, device_info TEXT, app_version TEXT, status TEXT DEFAULT 'new', response TEXT, responded_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "fs_sel" ON public.feedback_submissions FOR SELECT USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "fs_ins" ON public.feedback_submissions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_surveys (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), title TEXT NOT NULL, description TEXT, questions JSONB NOT NULL DEFAULT '[]', target_audience TEXT, status TEXT DEFAULT 'draft', response_count INTEGER DEFAULT 0, starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.user_surveys ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "usv_sel" ON public.user_surveys FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.survey_responses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), survey_id UUID NOT NULL REFERENCES public.user_surveys(id) ON DELETE CASCADE, user_id UUID NOT NULL, answers JSONB NOT NULL DEFAULT '{}', completed_at TIMESTAMPTZ DEFAULT now(), UNIQUE(survey_id, user_id));
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "svr_sel" ON public.survey_responses FOR SELECT USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "svr_ins" ON public.survey_responses FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.app_changelogs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), version TEXT NOT NULL, title TEXT NOT NULL, description TEXT, changes JSONB DEFAULT '[]', release_date DATE DEFAULT CURRENT_DATE, is_published BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.app_changelogs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ac_sel" ON public.app_changelogs FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_preferences (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL UNIQUE, language TEXT DEFAULT 'en', timezone TEXT DEFAULT 'UTC', theme TEXT DEFAULT 'system', font_size TEXT DEFAULT 'medium', autoplay_videos BOOLEAN DEFAULT true, data_saver BOOLEAN DEFAULT false, reduce_motion BOOLEAN DEFAULT false, content_language TEXT[], nsfw_filter BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "up_sel" ON public.user_preferences FOR SELECT USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "up_ins" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "up_upd" ON public.user_preferences FOR UPDATE USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_devices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, device_name TEXT, device_type TEXT, os TEXT, os_version TEXT, app_version TEXT, push_token TEXT, is_active BOOLEAN DEFAULT true, last_seen_at TIMESTAMPTZ DEFAULT now(), created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ud_sel" ON public.user_devices FOR SELECT USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ud_ins" ON public.user_devices FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ud_upd" ON public.user_devices FOR UPDATE USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.contact_sync (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, contact_hash TEXT NOT NULL, matched_user_id UUID, synced_at TIMESTAMPTZ DEFAULT now(), UNIQUE(user_id, contact_hash));
ALTER TABLE public.contact_sync ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "csn_sel" ON public.contact_sync FOR SELECT USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "csn_ins" ON public.contact_sync FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.invitation_links (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL, code TEXT NOT NULL UNIQUE, link_type TEXT DEFAULT 'general', max_uses INTEGER, use_count INTEGER DEFAULT 0, expires_at TIMESTAMPTZ, metadata JSONB, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());
ALTER TABLE public.invitation_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "il_sel" ON public.invitation_links FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "il_ins" ON public.invitation_links FOR INSERT WITH CHECK (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "il_upd" ON public.invitation_links FOR UPDATE USING (auth.uid()=user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
