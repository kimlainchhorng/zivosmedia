-- Super-app mega expansion (applied via Supabase MCP).
-- Tables: events, event_rsvps, marketplace_listings, job_postings,
-- job_applications, voice_rooms, voice_room_participants, push_subscriptions,
-- user_totp_secrets, user_e2e_keys, support_tickets, custom_emoji_packs,
-- fitness_activities, bug_reports, affiliate_links, recommendation_scores,
-- user_onboarding.

-- Events & RSVPs
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  cover_url TEXT,
  is_ticketed BOOLEAN NOT NULL DEFAULT false,
  ticket_price_cents INTEGER,
  capacity INTEGER,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','friends','group','private')),
  group_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_starts ON public.events(starts_at);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going','maybe','declined')),
  rsvped_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Marketplace
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT,
  condition TEXT CHECK (condition IN ('new','like_new','good','fair','for_parts')),
  images JSONB,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','sold','withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON public.marketplace_listings(status, created_at DESC);
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Jobs
CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  pay_cents INTEGER,
  pay_unit TEXT CHECK (pay_unit IN ('hour','task','month')),
  location TEXT,
  remote BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','filled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.job_postings(status, created_at DESC);
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewing','accepted','rejected','withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Voice rooms
CREATE TABLE IF NOT EXISTS public.voice_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  description TEXT,
  is_live BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);
ALTER TABLE public.voice_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.voice_room_participants (
  room_id UUID NOT NULL REFERENCES public.voice_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'listener' CHECK (role IN ('host','co_host','speaker','listener')),
  is_muted BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);
ALTER TABLE public.voice_room_participants ENABLE ROW LEVEL SECURITY;

-- Push notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  device_type TEXT CHECK (device_type IN ('web','ios','android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2FA
CREATE TABLE IF NOT EXISTS public.user_totp_secrets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_secret TEXT NOT NULL,
  recovery_codes_hashed JSONB,
  enabled_at TIMESTAMPTZ
);
ALTER TABLE public.user_totp_secrets ENABLE ROW LEVEL SECURITY;

-- E2E key bundles
CREATE TABLE IF NOT EXISTS public.user_e2e_keys (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  identity_pubkey TEXT NOT NULL,
  signed_prekey TEXT NOT NULL,
  one_time_prekeys JSONB,
  device_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_e2e_keys ENABLE ROW LEVEL SECURITY;

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  category TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_support_user ON public.support_tickets(user_id, created_at DESC);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Custom emoji packs
CREATE TABLE IF NOT EXISTS public.custom_emoji_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID,
  name TEXT NOT NULL,
  emojis JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_emoji_packs ENABLE ROW LEVEL SECURITY;

-- Fitness activities
CREATE TABLE IF NOT EXISTS public.fitness_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  duration_seconds INTEGER,
  distance_meters NUMERIC,
  calories INTEGER,
  steps INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT
);
CREATE INDEX IF NOT EXISTS idx_fitness_user_date ON public.fitness_activities(user_id, recorded_at DESC);
ALTER TABLE public.fitness_activities ENABLE ROW LEVEL SECURITY;

-- Bug reports
CREATE TABLE IF NOT EXISTS public.bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  page_url TEXT,
  user_agent TEXT,
  app_version TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Affiliate links
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  target_url TEXT NOT NULL,
  category TEXT,
  click_count INTEGER NOT NULL DEFAULT 0,
  conversion_count INTEGER NOT NULL DEFAULT 0,
  earnings_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

-- Recommendation cache
CREATE TABLE IF NOT EXISTS public.recommendation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_kind TEXT NOT NULL,
  item_id UUID NOT NULL,
  score NUMERIC NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recs_user_kind ON public.recommendation_scores(user_id, item_kind, score DESC);
ALTER TABLE public.recommendation_scores ENABLE ROW LEVEL SECURITY;

-- Onboarding progress
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Policies are applied directly via apply_migration; this file is documentation of schema.
