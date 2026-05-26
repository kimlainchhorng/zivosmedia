-- Create launch status enum
CREATE TYPE p2p_launch_status AS ENUM ('draft', 'ready', 'live', 'paused');

-- Create cities table for launch tracking
CREATE TABLE p2p_launch_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  launch_status p2p_launch_status DEFAULT 'draft',
  launched_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, state)
);

-- Create checklists table for each city
CREATE TABLE p2p_launch_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID REFERENCES p2p_launch_cities(id) ON DELETE CASCADE UNIQUE,
  -- Legal section
  legal_renter_terms BOOLEAN DEFAULT false,
  legal_owner_terms BOOLEAN DEFAULT false,
  legal_insurance_disclosure BOOLEAN DEFAULT false,
  legal_damage_policy BOOLEAN DEFAULT false,
  legal_privacy_policy BOOLEAN DEFAULT false,
  -- Insurance section
  insurance_provider_name TEXT,
  insurance_coverage_type TEXT DEFAULT 'Trip-based',
  insurance_confirmation_ref TEXT,
  insurance_active BOOLEAN DEFAULT false,
  -- Payments section
  payments_stripe_active BOOLEAN DEFAULT false,
  payments_connect_enabled BOOLEAN DEFAULT false,
  payments_test_payment BOOLEAN DEFAULT false,
  payments_test_payout BOOLEAN DEFAULT false,
  -- Operations section
  ops_dispute_tested BOOLEAN DEFAULT false,
  ops_damage_tested BOOLEAN DEFAULT false,
  ops_cancellation_tested BOOLEAN DEFAULT false,
  ops_payout_delay_tested BOOLEAN DEFAULT false,
  -- Support section
  support_email TEXT,
  support_emergency_procedure TEXT,
  support_confirmed BOOLEAN DEFAULT false,
  -- Supply minimums
  min_approved_cars INTEGER DEFAULT 10,
  min_approved_owners INTEGER DEFAULT 5,
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE p2p_launch_cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_launch_checklists ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for cities table
CREATE POLICY "Admin full access to launch cities"
  ON p2p_launch_cities FOR ALL
  USING (public.is_admin(auth.uid()));

-- Admin-only policies for checklists table
CREATE POLICY "Admin full access to launch checklists"
  ON p2p_launch_checklists FOR ALL
  USING (public.is_admin(auth.uid()));

-- Trigger to auto-create checklist when city is created
CREATE OR REPLACE FUNCTION create_city_checklist()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO p2p_launch_checklists (city_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_city_created
  AFTER INSERT ON p2p_launch_cities
  FOR EACH ROW
  EXECUTE FUNCTION create_city_checklist();

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_launch_cities_updated_at
  BEFORE UPDATE ON p2p_launch_cities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_launch_checklists_updated_at
  BEFORE UPDATE ON p2p_launch_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();