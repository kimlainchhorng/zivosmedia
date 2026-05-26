-- Create saved_travelers table for persistent traveler profiles
CREATE TABLE public.saved_travelers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  traveler_type TEXT NOT NULL DEFAULT 'adult' CHECK (traveler_type IN ('adult', 'child', 'infant')),
  title TEXT,
  given_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  born_on DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', NULL)),
  email TEXT,
  phone_number TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  passport_country TEXT,
  nationality TEXT,
  known_traveler_number TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, given_name, family_name, born_on)
);

-- Create user_email_preferences table
CREATE TABLE public.user_email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  marketing_emails BOOLEAN NOT NULL DEFAULT true,
  price_alerts BOOLEAN NOT NULL DEFAULT true,
  booking_updates BOOLEAN NOT NULL DEFAULT true,
  newsletter BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.saved_travelers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_travelers
CREATE POLICY "Users can view their own saved travelers"
ON public.saved_travelers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved travelers"
ON public.saved_travelers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved travelers"
ON public.saved_travelers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved travelers"
ON public.saved_travelers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for user_email_preferences
CREATE POLICY "Users can view their own email preferences"
ON public.user_email_preferences
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email preferences"
ON public.user_email_preferences
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email preferences"
ON public.user_email_preferences
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_saved_travelers_updated_at
BEFORE UPDATE ON public.saved_travelers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_preferences_updated_at
BEFORE UPDATE ON public.user_email_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_saved_travelers_user_id ON public.saved_travelers(user_id);
CREATE INDEX idx_email_preferences_user_id ON public.user_email_preferences(user_id);