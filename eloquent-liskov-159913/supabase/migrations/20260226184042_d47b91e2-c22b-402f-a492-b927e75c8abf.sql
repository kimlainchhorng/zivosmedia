
-- Saved traveler profiles for faster checkout
CREATE TABLE public.traveler_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT 'Primary',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  email TEXT,
  phone TEXT,
  nationality TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  passport_country TEXT,
  frequent_flyer_airline TEXT,
  frequent_flyer_number TEXT,
  tsa_precheck_number TEXT,
  known_traveler_number TEXT,
  redress_number TEXT,
  dietary_preferences TEXT[],
  seat_preference TEXT,
  special_assistance TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.traveler_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own traveler profiles
CREATE POLICY "Users can view own traveler profiles"
  ON public.traveler_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own traveler profiles"
  ON public.traveler_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own traveler profiles"
  ON public.traveler_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own traveler profiles"
  ON public.traveler_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.traveler_profiles TO authenticated;

-- Index for fast lookups
CREATE INDEX idx_traveler_profiles_user_id ON public.traveler_profiles(user_id);

-- Auto-update timestamps
CREATE TRIGGER update_traveler_profiles_updated_at
  BEFORE UPDATE ON public.traveler_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
