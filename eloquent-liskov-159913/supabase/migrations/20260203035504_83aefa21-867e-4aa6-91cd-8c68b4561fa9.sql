-- Extend flights_launch_settings for 3-tier launch system
-- Add phase column with Internal Test, Private Beta, Public Live

-- First, update the status column to support new phases
ALTER TABLE public.flights_launch_settings 
  ADD COLUMN IF NOT EXISTS launch_phase TEXT DEFAULT 'internal_test',
  ADD COLUMN IF NOT EXISTS beta_invite_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS beta_invite_code TEXT,
  ADD COLUMN IF NOT EXISTS launch_announcement_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS launch_announcement_text TEXT,
  ADD COLUMN IF NOT EXISTS refund_flow_tested BOOLEAN DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.flights_launch_settings.launch_phase IS 'internal_test, private_beta, or public_live';

-- Create flight_beta_invites table for Private Beta access
CREATE TABLE IF NOT EXISTS public.flight_beta_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  invite_code TEXT NOT NULL UNIQUE,
  invited_by TEXT,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.flight_beta_invites ENABLE ROW LEVEL SECURITY;

-- Admin can manage invites
CREATE POLICY "Admins can manage beta invites"
ON public.flight_beta_invites
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Users can view their own invite
CREATE POLICY "Users can view own invite"
ON public.flight_beta_invites
FOR SELECT
USING (user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_flight_beta_invites_email ON public.flight_beta_invites(email);
CREATE INDEX IF NOT EXISTS idx_flight_beta_invites_code ON public.flight_beta_invites(invite_code);