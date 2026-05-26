-- ========================================
-- Car Rental Level 5: Fleet Owners & Business Accounts
-- ========================================

-- Fleet owner types enum
CREATE TYPE public.fleet_owner_status AS ENUM ('pending', 'approved', 'suspended', 'rejected');
CREATE TYPE public.fleet_team_role AS ENUM ('admin', 'manager', 'staff');
CREATE TYPE public.business_account_status AS ENUM ('pending', 'approved', 'suspended');

-- Fleet Owner Profiles
CREATE TABLE IF NOT EXISTS public.fleet_owner_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Business info
  business_name TEXT NOT NULL,
  business_type TEXT DEFAULT 'llc' CHECK (business_type IN ('sole_proprietor', 'llc', 'corporation', 'partnership')),
  tax_id TEXT,
  business_license TEXT,
  
  -- Contact
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  
  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  
  -- Status & verification
  status fleet_owner_status DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  
  -- Commission & payouts
  custom_commission_percent DECIMAL(5,2),
  stripe_account_id TEXT,
  stripe_payouts_enabled BOOLEAN DEFAULT false,
  
  -- Fleet settings
  default_daily_rate DECIMAL(10,2),
  default_min_rental_days INTEGER DEFAULT 1,
  default_max_rental_days INTEGER DEFAULT 30,
  default_deposit_amount DECIMAL(10,2) DEFAULT 500,
  default_cancellation_policy TEXT DEFAULT 'moderate',
  delivery_enabled_fleet_wide BOOLEAN DEFAULT false,
  
  -- Stats
  total_vehicles INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  average_rating DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Fleet Team Members
CREATE TABLE IF NOT EXISTS public.fleet_team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_id UUID NOT NULL REFERENCES public.fleet_owner_profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  role fleet_team_role NOT NULL DEFAULT 'staff',
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{"vehicles": false, "pricing": false, "bookings": false, "payouts": false, "team": false}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(fleet_id, user_id)
);

-- Fleet Pricing Rules
CREATE TABLE IF NOT EXISTS public.fleet_pricing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fleet_id UUID NOT NULL REFERENCES public.fleet_owner_profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  car_class TEXT, -- NULL means all classes
  
  -- Pricing
  daily_rate DECIMAL(10,2),
  weekend_rate DECIMAL(10,2),
  weekly_discount_percent DECIMAL(5,2) DEFAULT 10,
  monthly_discount_percent DECIMAL(5,2) DEFAULT 20,
  
  -- Corporate tiers
  is_corporate_rate BOOLEAN DEFAULT false,
  corporate_discount_percent DECIMAL(5,2),
  
  -- Validity
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Business/Corporate Renter Accounts
CREATE TABLE IF NOT EXISTS public.business_renter_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Company info
  company_name TEXT NOT NULL,
  company_size TEXT CHECK (company_size IN ('1-10', '11-50', '51-200', '201-500', '500+')),
  industry TEXT,
  tax_id TEXT,
  
  -- Contact
  billing_contact_name TEXT NOT NULL,
  billing_contact_email TEXT NOT NULL,
  billing_contact_phone TEXT,
  
  -- Billing address
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,
  
  -- Status
  status business_account_status DEFAULT 'pending',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  
  -- Billing settings
  payment_method TEXT DEFAULT 'card' CHECK (payment_method IN ('card', 'invoice', 'monthly')),
  credit_limit DECIMAL(12,2),
  payment_terms_days INTEGER DEFAULT 30,
  
  -- Stats
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Business Account Authorized Drivers
CREATE TABLE IF NOT EXISTS public.business_authorized_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_account_id UUID NOT NULL REFERENCES public.business_renter_accounts(id) ON DELETE CASCADE,
  
  driver_name TEXT NOT NULL,
  driver_email TEXT,
  driver_phone TEXT,
  license_number TEXT,
  license_state TEXT,
  license_expiry DATE,
  
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Vehicle Reservations (for priority booking)
CREATE TABLE IF NOT EXISTS public.vehicle_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.p2p_vehicles(id) ON DELETE CASCADE,
  
  reservation_type TEXT NOT NULL CHECK (reservation_type IN ('corporate', 'fleet_hold', 'maintenance', 'other')),
  business_account_id UUID REFERENCES public.business_renter_accounts(id),
  
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  notes TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Add fleet_id to p2p_vehicles
ALTER TABLE public.p2p_vehicles
ADD COLUMN IF NOT EXISTS fleet_id UUID REFERENCES public.fleet_owner_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS car_class TEXT DEFAULT 'standard' CHECK (car_class IN ('economy', 'compact', 'standard', 'full_size', 'premium', 'luxury', 'suv', 'van', 'truck'));

-- Enable RLS
ALTER TABLE public.fleet_owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_renter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_authorized_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_reservations ENABLE ROW LEVEL SECURITY;

-- Fleet owner policies
CREATE POLICY "Fleet owners can manage their profile"
ON public.fleet_owner_profiles
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all fleet profiles"
ON public.fleet_owner_profiles
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Fleet team policies
CREATE POLICY "Fleet owners can manage team"
ON public.fleet_team_members
FOR ALL
USING (
  EXISTS (SELECT 1 FROM fleet_owner_profiles WHERE id = fleet_id AND user_id = auth.uid())
);

CREATE POLICY "Team members can view their membership"
ON public.fleet_team_members
FOR SELECT
USING (user_id = auth.uid());

-- Fleet pricing policies
CREATE POLICY "Fleet owners can manage pricing rules"
ON public.fleet_pricing_rules
FOR ALL
USING (
  EXISTS (SELECT 1 FROM fleet_owner_profiles WHERE id = fleet_id AND user_id = auth.uid())
);

-- Business account policies
CREATE POLICY "Business account owners can manage their account"
ON public.business_renter_accounts
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all business accounts"
ON public.business_renter_accounts
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Authorized drivers policies
CREATE POLICY "Business accounts can manage drivers"
ON public.business_authorized_drivers
FOR ALL
USING (
  EXISTS (SELECT 1 FROM business_renter_accounts WHERE id = business_account_id AND user_id = auth.uid())
);

-- Vehicle reservation policies
CREATE POLICY "Fleet owners can manage reservations"
ON public.vehicle_reservations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM p2p_vehicles v
    JOIN fleet_owner_profiles f ON v.fleet_id = f.id
    WHERE v.id = vehicle_id AND f.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all reservations"
ON public.vehicle_reservations
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fleet_owner_profiles_status ON public.fleet_owner_profiles(status);
CREATE INDEX IF NOT EXISTS idx_fleet_team_members_fleet ON public.fleet_team_members(fleet_id);
CREATE INDEX IF NOT EXISTS idx_fleet_pricing_rules_fleet ON public.fleet_pricing_rules(fleet_id);
CREATE INDEX IF NOT EXISTS idx_business_renter_accounts_status ON public.business_renter_accounts(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_vehicle ON public.vehicle_reservations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_dates ON public.vehicle_reservations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_p2p_vehicles_fleet ON public.p2p_vehicles(fleet_id) WHERE fleet_id IS NOT NULL;