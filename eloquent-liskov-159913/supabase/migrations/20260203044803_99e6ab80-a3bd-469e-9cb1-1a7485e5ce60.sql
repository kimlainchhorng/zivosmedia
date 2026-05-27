-- ========================================
-- Car Rental Level 6: Insurance & Protection Plans
-- ========================================

-- Protection plan tiers enum (if not exists)
DO $$ BEGIN
  CREATE TYPE public.protection_tier AS ENUM ('basic', 'standard', 'premium');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.insurance_claim_status AS ENUM ('submitted', 'under_review', 'approved', 'denied', 'paid_out', 'closed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Protection Plans (available options)
CREATE TABLE IF NOT EXISTS public.p2p_protection_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  tier TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  daily_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  deductible DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Coverage limits
  liability_coverage DECIMAL(12,2) NOT NULL DEFAULT 0,
  collision_coverage DECIMAL(12,2) NOT NULL DEFAULT 0,
  comprehensive_coverage DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- What's covered
  coverage_includes JSONB DEFAULT '[]'::jsonb,
  coverage_excludes JSONB DEFAULT '[]'::jsonb,
  
  -- Provider info
  insurance_partner TEXT DEFAULT 'ZIVO Insurance Partners',
  policy_document_url TEXT,
  
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Owner Protection Requirements on vehicles
ALTER TABLE public.p2p_vehicles
ADD COLUMN IF NOT EXISTS minimum_protection_tier TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS owner_insurance_policy TEXT,
ADD COLUMN IF NOT EXISTS owner_insurance_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS owner_insurance_expiry DATE;

-- Booking Protection Selection
ALTER TABLE public.p2p_bookings
ADD COLUMN IF NOT EXISTS protection_plan_id UUID REFERENCES public.p2p_protection_plans(id),
ADD COLUMN IF NOT EXISTS protection_tier TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS protection_daily_rate DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS protection_total DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS protection_deductible DECIMAL(10,2);

-- Enhanced Insurance Claims table
CREATE TABLE IF NOT EXISTS public.p2p_enhanced_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  damage_report_id UUID REFERENCES public.p2p_damage_reports(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL,
  
  -- Claim info
  claim_number TEXT UNIQUE,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'denied', 'paid_out', 'closed')),
  
  -- Protection applied
  protection_tier TEXT,
  deductible_amount DECIMAL(10,2),
  
  -- Financial
  total_damage_amount DECIMAL(10,2),
  covered_amount DECIMAL(10,2),
  renter_responsibility DECIMAL(10,2),
  owner_payout DECIMAL(10,2),
  
  -- Partner communication
  insurance_partner TEXT,
  partner_claim_ref TEXT,
  partner_response JSONB,
  partner_decision TEXT,
  partner_notes TEXT,
  
  -- Timeline
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  decision_at TIMESTAMP WITH TIME ZONE,
  paid_out_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin tracking
  admin_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Claim Documents (photos, policies, receipts)
CREATE TABLE IF NOT EXISTS public.p2p_claim_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES public.p2p_enhanced_claims(id) ON DELETE CASCADE,
  
  document_type TEXT NOT NULL CHECK (document_type IN ('damage_photo', 'repair_estimate', 'repair_invoice', 'police_report', 'insurance_policy', 'other')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  description TEXT,
  
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ZIVO Commission on Protection Plans
CREATE TABLE IF NOT EXISTS public.p2p_protection_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL,
  protection_plan_id UUID REFERENCES public.p2p_protection_plans(id),
  
  protection_revenue DECIMAL(10,2) NOT NULL,
  commission_percent DECIMAL(5,2) DEFAULT 25,
  commission_amount DECIMAL(10,2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2p_protection_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_enhanced_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_claim_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.p2p_protection_commissions ENABLE ROW LEVEL SECURITY;

-- Protection plans readable by all (public info)
CREATE POLICY "Protection plans are public"
ON public.p2p_protection_plans
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage protection plans"
ON public.p2p_protection_plans
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Enhanced claims policies
CREATE POLICY "Admins can manage all enhanced claims"
ON public.p2p_enhanced_claims
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view their claims"
ON public.p2p_enhanced_claims
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM p2p_bookings b
    WHERE b.id = booking_id
    AND b.renter_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM p2p_bookings b
    JOIN car_owner_profiles cop ON cop.id = b.owner_id
    WHERE b.id = booking_id AND cop.user_id = auth.uid()
  )
);

-- Claim documents policies
CREATE POLICY "Admins can manage claim documents"
ON public.p2p_claim_documents
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Protection commissions admin only
CREATE POLICY "Admins can view protection commissions"
ON public.p2p_protection_commissions
FOR SELECT
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_enhanced_claims_status ON public.p2p_enhanced_claims(status);
CREATE INDEX IF NOT EXISTS idx_enhanced_claims_booking ON public.p2p_enhanced_claims(booking_id);
CREATE INDEX IF NOT EXISTS idx_claim_documents_claim ON public.p2p_claim_documents(claim_id);
CREATE INDEX IF NOT EXISTS idx_p2p_bookings_protection ON public.p2p_bookings(protection_plan_id);

-- Insert default protection plans
INSERT INTO public.p2p_protection_plans (tier, name, description, daily_rate, deductible, liability_coverage, collision_coverage, comprehensive_coverage, coverage_includes, coverage_excludes, sort_order) VALUES
('basic', 'Basic Protection', 'Minimum coverage included with every rental', 0, 2500, 100000, 25000, 10000, 
  '["Third-party liability", "State minimum requirements"]'::jsonb,
  '["Tire/wheel damage", "Interior damage", "Personal belongings", "Administrative fees"]'::jsonb, 1),
('standard', 'Standard Protection', 'Recommended coverage for peace of mind', 15, 1000, 300000, 50000, 25000,
  '["Third-party liability", "Collision damage", "Theft protection", "24/7 roadside assistance"]'::jsonb,
  '["Personal belongings", "Administrative fees"]'::jsonb, 2),
('premium', 'Premium Protection', 'Maximum coverage with lowest deductible', 29, 250, 500000, 75000, 50000,
  '["Third-party liability", "Collision damage", "Theft protection", "24/7 roadside assistance", "Tire/wheel coverage", "Windshield coverage", "Personal effects up to $500"]'::jsonb,
  '["Intentional damage", "Driving under influence"]'::jsonb, 3)
ON CONFLICT (tier) DO NOTHING;