-- Add ar_settings JSONB column to store_profiles for auto-repair shop configuration
ALTER TABLE public.store_profiles
  ADD COLUMN IF NOT EXISTS ar_settings jsonb DEFAULT '{}'::jsonb;
