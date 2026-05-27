-- Add affiliate tracking columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN affiliate_code text,
ADD COLUMN affiliate_partner_name text,
ADD COLUMN affiliate_captured_at timestamptz;

-- Index for admin queries on affiliate signups
CREATE INDEX idx_profiles_affiliate_code ON public.profiles (affiliate_code)
WHERE affiliate_code IS NOT NULL;

COMMENT ON COLUMN public.profiles.affiliate_code IS 'Affiliate/partner code captured from URL on signup';
COMMENT ON COLUMN public.profiles.affiliate_partner_name IS 'Human-readable partner name (optional)';
COMMENT ON COLUMN public.profiles.affiliate_captured_at IS 'Timestamp when the affiliate code was captured';