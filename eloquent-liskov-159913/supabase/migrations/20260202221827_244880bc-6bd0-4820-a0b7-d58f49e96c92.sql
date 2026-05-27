-- Create renter waitlist table
CREATE TABLE public.p2p_renter_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'joined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create unique index on email (case-insensitive)
CREATE UNIQUE INDEX idx_renter_waitlist_email_unique ON p2p_renter_waitlist (lower(email));

-- Create renter invites table
CREATE TABLE public.p2p_renter_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  waitlist_id UUID REFERENCES p2p_renter_waitlist(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_renter_waitlist_status ON p2p_renter_waitlist(status);
CREATE INDEX idx_renter_invites_code ON p2p_renter_invites(invite_code);
CREATE INDEX idx_renter_invites_email ON p2p_renter_invites(lower(email));

-- Insert renter beta settings
INSERT INTO system_settings (key, value, description, category, is_public)
VALUES 
  ('p2p_renter_beta_mode', 'true', 'Enable invite-only renter beta', 'p2p', false),
  ('p2p_renter_beta_city', '"Los Angeles"', 'Current beta city for renters', 'p2p', true),
  ('p2p_renter_beta_message', '"We''re launching in select cities with limited spots to ensure safety and quality."', 'Waitlist message for renters', 'p2p', true)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE p2p_renter_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_renter_invites ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can insert to waitlist (public signup)
CREATE POLICY "Anyone can join waitlist"
  ON p2p_renter_waitlist FOR INSERT
  WITH CHECK (true);

-- RLS: Admin can view all waitlist entries
CREATE POLICY "Admin can view waitlist"
  ON p2p_renter_waitlist FOR SELECT
  USING (public.is_admin(auth.uid()));

-- RLS: Admin can update waitlist entries
CREATE POLICY "Admin can update waitlist"
  ON p2p_renter_waitlist FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- RLS: Admin can delete waitlist entries
CREATE POLICY "Admin can delete waitlist"
  ON p2p_renter_waitlist FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS: Admin full access to invites
CREATE POLICY "Admin full access to invites"
  ON p2p_renter_invites FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS: Users can check their own invite by email
CREATE POLICY "Users can check own invite"
  ON p2p_renter_invites FOR SELECT
  USING (lower(email) = lower(auth.jwt()->>'email'));