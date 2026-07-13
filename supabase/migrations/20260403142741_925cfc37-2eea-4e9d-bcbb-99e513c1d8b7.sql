
CREATE TABLE IF NOT EXISTS public.content_moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, content_id TEXT NOT NULL, reported_by UUID,
  auto_flagged BOOLEAN DEFAULT false, reason TEXT NOT NULL, severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending', assigned_to UUID, priority INTEGER DEFAULT 0,
  ai_confidence NUMERIC, ai_category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.content_moderation_queue ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "cmq_sel" ON public.content_moderation_queue FOR SELECT USING (auth.uid() = reported_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "cmq_ins" ON public.content_moderation_queue FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_item_id UUID REFERENCES public.content_moderation_queue(id),
  moderator_id UUID NOT NULL, action_type TEXT NOT NULL,
  target_user_id UUID, target_content_id TEXT, target_content_type TEXT,
  reason TEXT, notes TEXT, duration_hours INTEGER,
  is_automated BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ma_sel" ON public.moderation_actions FOR SELECT USING (auth.uid() = target_user_id OR auth.uid() = moderator_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.appeal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, action_id UUID REFERENCES public.moderation_actions(id),
  appeal_text TEXT NOT NULL, evidence_urls JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending', reviewed_by UUID,
  review_notes TEXT, reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.appeal_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ar_sel" ON public.appeal_requests FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "ar_ins" ON public.appeal_requests FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.shadow_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, reason TEXT, applied_by UUID,
  scope TEXT DEFAULT 'full', expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.shadow_bans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "sb_sel" ON public.shadow_bans FOR SELECT USING (auth.uid() = applied_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "sb_ins" ON public.shadow_bans FOR INSERT WITH CHECK (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.trust_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, score NUMERIC DEFAULT 50,
  factors JSONB DEFAULT '{}', last_calculated_at TIMESTAMPTZ DEFAULT now(),
  report_count INTEGER DEFAULT 0, violation_count INTEGER DEFAULT 0,
  positive_signals INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.trust_scores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ts_sel" ON public.trust_scores FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.spam_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, content_type TEXT, content_id TEXT,
  detection_method TEXT, confidence NUMERIC, pattern TEXT,
  action_taken TEXT, is_false_positive BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.spam_detections ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "sd_sel" ON public.spam_detections FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.ip_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL, reason TEXT, banned_by UUID,
  expires_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ip_bans ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "ib_sel" ON public.ip_bans FOR SELECT USING (auth.uid() = banned_by); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, warned_by UUID, warning_type TEXT NOT NULL,
  message TEXT NOT NULL, severity TEXT DEFAULT 'mild',
  is_acknowledged BOOLEAN DEFAULT false, acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "uw_sel" ON public.user_warnings FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "uw_upd" ON public.user_warnings FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.restricted_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL, category TEXT DEFAULT 'general',
  severity TEXT DEFAULT 'medium', action TEXT DEFAULT 'flag',
  is_active BOOLEAN DEFAULT true, added_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.restricted_words ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "rw_sel" ON public.restricted_words FOR SELECT USING (auth.uid() IS NOT NULL); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.safety_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL, reported_user_id UUID,
  incident_type TEXT NOT NULL, description TEXT,
  evidence_urls JSONB DEFAULT '[]', location TEXT,
  urgency TEXT DEFAULT 'normal', status TEXT DEFAULT 'open',
  assigned_to UUID, resolution TEXT, resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN CREATE POLICY "sr_sel" ON public.safety_reports FOR SELECT USING (auth.uid() = reporter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "sr_ins" ON public.safety_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
