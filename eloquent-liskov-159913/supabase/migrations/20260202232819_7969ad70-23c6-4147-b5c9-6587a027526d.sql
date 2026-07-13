-- Create launch_settings table for global launch controls
CREATE TABLE public.launch_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Global Launch Mode
  global_mode TEXT NOT NULL DEFAULT 'beta' CHECK (global_mode IN ('beta', 'live')),
  
  -- Emergency Controls
  emergency_pause BOOLEAN NOT NULL DEFAULT false,
  emergency_pause_reason TEXT,
  emergency_pause_at TIMESTAMPTZ,
  emergency_pause_by UUID,
  
  -- Booking Limits
  daily_booking_limit_per_city INTEGER DEFAULT 20,
  enforce_supply_minimum BOOLEAN DEFAULT true,
  min_owners_for_launch INTEGER DEFAULT 5,
  min_vehicles_for_launch INTEGER DEFAULT 10,
  
  -- Announcements
  announcement_enabled BOOLEAN DEFAULT false,
  announcement_text TEXT,
  announcement_cities TEXT[],
  
  -- Timestamps
  mode_changed_at TIMESTAMPTZ,
  mode_changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.launch_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read for UI display (needed for beta badge, announcement, etc.)
CREATE POLICY "Anyone can read launch settings"
  ON public.launch_settings FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update launch settings"
  ON public.launch_settings FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Only admins can insert (for initial setup)
CREATE POLICY "Admins can insert launch settings"
  ON public.launch_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Insert initial row
INSERT INTO public.launch_settings (global_mode, emergency_pause) 
VALUES ('beta', false);

-- Add booking limit columns to p2p_launch_cities
ALTER TABLE public.p2p_launch_cities 
ADD COLUMN IF NOT EXISTS daily_booking_limit INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS bookings_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_booking_reset DATE DEFAULT CURRENT_DATE;