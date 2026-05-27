-- =============================================
-- ZIVO P2P CAR RENTAL MARKETPLACE - PHASE 1
-- Database Schema, Enums, RLS Policies
-- =============================================

-- =============================================
-- 1. CREATE ENUMS
-- =============================================

-- Owner profile status
CREATE TYPE car_owner_status AS ENUM ('pending', 'verified', 'rejected', 'suspended');

-- Document types for owner verification
CREATE TYPE car_owner_document_type AS ENUM ('drivers_license', 'vehicle_registration', 'insurance', 'title', 'id_card');

-- Document review status
CREATE TYPE document_review_status AS ENUM ('pending', 'approved', 'rejected');

-- Insurance options for owners
CREATE TYPE car_owner_insurance_option AS ENUM ('platform', 'own', 'none');

-- Vehicle approval status
CREATE TYPE p2p_vehicle_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Vehicle category
CREATE TYPE p2p_vehicle_category AS ENUM ('economy', 'compact', 'midsize', 'fullsize', 'suv', 'luxury', 'minivan', 'truck');

-- Fuel type
CREATE TYPE p2p_fuel_type AS ENUM ('gasoline', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid');

-- Transmission type
CREATE TYPE p2p_transmission_type AS ENUM ('automatic', 'manual');

-- Booking status
CREATE TYPE p2p_booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'disputed');

-- Payment status
CREATE TYPE p2p_payment_status AS ENUM ('pending', 'authorized', 'captured', 'refunded', 'failed');

-- Payout status
CREATE TYPE p2p_payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Dispute status
CREATE TYPE p2p_dispute_status AS ENUM ('open', 'investigating', 'resolved', 'closed');

-- Dispute type
CREATE TYPE p2p_dispute_type AS ENUM ('damage', 'late_return', 'cancellation', 'refund', 'cleanliness', 'other');

-- Review type
CREATE TYPE p2p_review_type AS ENUM ('renter_to_owner', 'owner_to_renter', 'renter_to_vehicle');

-- =============================================
-- 2. CREATE TABLES
-- =============================================

-- Car Owner Profiles
CREATE TABLE car_owner_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  date_of_birth DATE,
  ssn_last_four TEXT, -- encrypted reference only
  stripe_account_id TEXT,
  payout_enabled BOOLEAN DEFAULT false,
  status car_owner_status DEFAULT 'pending',
  documents_verified BOOLEAN DEFAULT false,
  insurance_option car_owner_insurance_option DEFAULT 'platform',
  bio TEXT,
  response_rate NUMERIC DEFAULT 0,
  response_time_hours NUMERIC DEFAULT 24,
  total_trips INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_owner_user UNIQUE (user_id)
);

-- Car Owner Documents
CREATE TABLE car_owner_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES car_owner_profiles(id) ON DELETE CASCADE,
  document_type car_owner_document_type NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  status document_review_status DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  expires_at DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- P2P Vehicles
CREATE TABLE p2p_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES car_owner_profiles(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  trim TEXT,
  color TEXT,
  vin TEXT,
  license_plate TEXT,
  category p2p_vehicle_category NOT NULL DEFAULT 'economy',
  transmission p2p_transmission_type DEFAULT 'automatic',
  fuel_type p2p_fuel_type DEFAULT 'gasoline',
  seats INTEGER DEFAULT 5,
  doors INTEGER DEFAULT 4,
  mileage INTEGER DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  description TEXT,
  daily_rate NUMERIC NOT NULL,
  weekly_rate NUMERIC,
  monthly_rate NUMERIC,
  min_trip_days INTEGER DEFAULT 1,
  max_trip_days INTEGER DEFAULT 30,
  location_address TEXT,
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,
  lat NUMERIC,
  lng NUMERIC,
  images JSONB DEFAULT '[]'::jsonb,
  approval_status p2p_vehicle_status DEFAULT 'pending',
  rejection_reason TEXT,
  is_available BOOLEAN DEFAULT true,
  instant_book BOOLEAN DEFAULT false,
  total_trips INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT year_minimum CHECK (year >= 2018),
  CONSTRAINT valid_daily_rate CHECK (daily_rate > 0),
  CONSTRAINT valid_seats CHECK (seats > 0 AND seats <= 15),
  CONSTRAINT valid_doors CHECK (doors > 0 AND doors <= 6)
);

-- Vehicle Availability Calendar
CREATE TABLE vehicle_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES p2p_vehicles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT true,
  price_override NUMERIC,
  booking_id UUID, -- will reference p2p_bookings after it's created
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_vehicle_date UNIQUE (vehicle_id, date)
);

-- P2P Bookings
CREATE TABLE p2p_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES p2p_vehicles(id) ON DELETE RESTRICT,
  renter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  owner_id UUID NOT NULL REFERENCES car_owner_profiles(id) ON DELETE RESTRICT,
  pickup_date TIMESTAMPTZ NOT NULL,
  return_date TIMESTAMPTZ NOT NULL,
  pickup_location TEXT,
  return_location TEXT,
  total_days INTEGER NOT NULL,
  daily_rate NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL,
  service_fee NUMERIC DEFAULT 0,
  platform_fee NUMERIC DEFAULT 0,
  insurance_fee NUMERIC DEFAULT 0,
  taxes NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  owner_payout NUMERIC NOT NULL,
  status p2p_booking_status DEFAULT 'pending',
  payment_status p2p_payment_status DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  renter_license_verified BOOLEAN DEFAULT false,
  insurance_accepted BOOLEAN DEFAULT false,
  terms_accepted BOOLEAN DEFAULT false,
  pickup_confirmed_at TIMESTAMPTZ,
  pickup_confirmed_by TEXT, -- 'owner' or 'renter'
  return_confirmed_at TIMESTAMPTZ,
  return_confirmed_by TEXT,
  actual_return_date TIMESTAMPTZ,
  mileage_start INTEGER,
  mileage_end INTEGER,
  fuel_level_start TEXT,
  fuel_level_end TEXT,
  notes TEXT,
  cancellation_reason TEXT,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_dates CHECK (return_date > pickup_date),
  CONSTRAINT valid_total_days CHECK (total_days > 0)
);

-- Add booking_id FK to vehicle_availability
ALTER TABLE vehicle_availability 
ADD CONSTRAINT fk_availability_booking 
FOREIGN KEY (booking_id) REFERENCES p2p_bookings(id) ON DELETE SET NULL;

-- P2P Reviews
CREATE TABLE p2p_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES p2p_bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID, -- owner user_id or renter user_id
  vehicle_id UUID REFERENCES p2p_vehicles(id) ON DELETE CASCADE,
  review_type p2p_review_type NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  cleanliness INTEGER CHECK (cleanliness >= 1 AND cleanliness <= 5),
  communication INTEGER CHECK (communication >= 1 AND communication <= 5),
  accuracy INTEGER CHECK (accuracy >= 1 AND accuracy <= 5),
  value INTEGER CHECK (value >= 1 AND value <= 5),
  condition INTEGER CHECK (condition >= 1 AND condition <= 5),
  is_public BOOLEAN DEFAULT true,
  owner_response TEXT,
  owner_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_review_per_booking UNIQUE (booking_id, reviewer_id, review_type)
);

-- P2P Payouts
CREATE TABLE p2p_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES car_owner_profiles(id) ON DELETE RESTRICT,
  booking_id UUID REFERENCES p2p_bookings(id) ON DELETE RESTRICT,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC DEFAULT 0,
  net_amount NUMERIC NOT NULL,
  status p2p_payout_status DEFAULT 'pending',
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  failed_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- P2P Disputes
CREATE TABLE p2p_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES p2p_bookings(id) ON DELETE RESTRICT,
  raised_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  dispute_type p2p_dispute_type NOT NULL,
  description TEXT NOT NULL,
  evidence JSONB DEFAULT '[]'::jsonb,
  status p2p_dispute_status DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  resolution TEXT,
  resolution_amount NUMERIC,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- P2P Commission Settings
CREATE TABLE p2p_commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_commission_pct NUMERIC DEFAULT 20 CHECK (owner_commission_pct >= 0 AND owner_commission_pct <= 50),
  renter_service_fee_pct NUMERIC DEFAULT 10 CHECK (renter_service_fee_pct >= 0 AND renter_service_fee_pct <= 30),
  insurance_daily_fee NUMERIC DEFAULT 15,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default commission settings
INSERT INTO p2p_commission_settings (name, description, owner_commission_pct, renter_service_fee_pct, is_active)
VALUES ('Default P2P Commission', 'Standard commission rates for P2P rentals', 20, 10, true);

-- =============================================
-- 3. CREATE INDEXES
-- =============================================

CREATE INDEX idx_owner_profiles_user ON car_owner_profiles(user_id);
CREATE INDEX idx_owner_profiles_status ON car_owner_profiles(status);
CREATE INDEX idx_owner_documents_owner ON car_owner_documents(owner_id);
CREATE INDEX idx_owner_documents_status ON car_owner_documents(status);

CREATE INDEX idx_p2p_vehicles_owner ON p2p_vehicles(owner_id);
CREATE INDEX idx_p2p_vehicles_status ON p2p_vehicles(approval_status);
CREATE INDEX idx_p2p_vehicles_location ON p2p_vehicles(location_city, location_state);
CREATE INDEX idx_p2p_vehicles_category ON p2p_vehicles(category);
CREATE INDEX idx_p2p_vehicles_available ON p2p_vehicles(is_available, approval_status);

CREATE INDEX idx_vehicle_availability_vehicle ON vehicle_availability(vehicle_id);
CREATE INDEX idx_vehicle_availability_date ON vehicle_availability(date);
CREATE INDEX idx_vehicle_availability_booking ON vehicle_availability(booking_id);

CREATE INDEX idx_p2p_bookings_vehicle ON p2p_bookings(vehicle_id);
CREATE INDEX idx_p2p_bookings_renter ON p2p_bookings(renter_id);
CREATE INDEX idx_p2p_bookings_owner ON p2p_bookings(owner_id);
CREATE INDEX idx_p2p_bookings_status ON p2p_bookings(status);
CREATE INDEX idx_p2p_bookings_dates ON p2p_bookings(pickup_date, return_date);

CREATE INDEX idx_p2p_reviews_booking ON p2p_reviews(booking_id);
CREATE INDEX idx_p2p_reviews_vehicle ON p2p_reviews(vehicle_id);
CREATE INDEX idx_p2p_reviews_reviewer ON p2p_reviews(reviewer_id);

CREATE INDEX idx_p2p_payouts_owner ON p2p_payouts(owner_id);
CREATE INDEX idx_p2p_payouts_status ON p2p_payouts(status);

CREATE INDEX idx_p2p_disputes_booking ON p2p_disputes(booking_id);
CREATE INDEX idx_p2p_disputes_status ON p2p_disputes(status);

-- =============================================
-- 4. ENABLE RLS
-- =============================================

ALTER TABLE car_owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_owner_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE p2p_commission_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 5. RLS POLICIES
-- =============================================

-- Car Owner Profiles Policies
CREATE POLICY "Users can view their own owner profile"
  ON car_owner_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own owner profile"
  ON car_owner_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own owner profile"
  ON car_owner_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all owner profiles"
  ON car_owner_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update all owner profiles"
  ON car_owner_profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

-- Car Owner Documents Policies
CREATE POLICY "Owners can view their own documents"
  ON car_owner_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM car_owner_profiles 
    WHERE car_owner_profiles.id = car_owner_documents.owner_id 
    AND car_owner_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Owners can upload their own documents"
  ON car_owner_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM car_owner_profiles 
    WHERE car_owner_profiles.id = owner_id 
    AND car_owner_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all documents"
  ON car_owner_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update all documents"
  ON car_owner_documents FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

-- P2P Vehicles Policies
CREATE POLICY "Anyone can view approved and available vehicles"
  ON p2p_vehicles FOR SELECT
  USING (approval_status = 'approved' AND is_available = true);

CREATE POLICY "Owners can view their own vehicles"
  ON p2p_vehicles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM car_owner_profiles 
    WHERE car_owner_profiles.id = p2p_vehicles.owner_id 
    AND car_owner_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Owners can create vehicles"
  ON p2p_vehicles FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM car_owner_profiles 
    WHERE car_owner_profiles.id = owner_id 
    AND car_owner_profiles.user_id = auth.uid()
    AND car_owner_profiles.status = 'verified'
  ));

CREATE POLICY "Owners can update their own vehicles"
  ON p2p_vehicles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM car_owner_profiles 
    WHERE car_owner_profiles.id = p2p_vehicles.owner_id 
    AND car_owner_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Owners can delete their own pending vehicles"
  ON p2p_vehicles FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM car_owner_profiles 
    WHERE car_owner_profiles.id = p2p_vehicles.owner_id 
    AND car_owner_profiles.user_id = auth.uid()
  ) AND approval_status = 'pending');

CREATE POLICY "Admins can view all vehicles"
  ON p2p_vehicles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update all vehicles"
  ON p2p_vehicles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

-- Vehicle Availability Policies
CREATE POLICY "Anyone can view availability for approved vehicles"
  ON vehicle_availability FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM p2p_vehicles 
    WHERE p2p_vehicles.id = vehicle_availability.vehicle_id 
    AND p2p_vehicles.approval_status = 'approved'
  ));

CREATE POLICY "Owners can manage availability for their vehicles"
  ON vehicle_availability FOR ALL
  USING (EXISTS (
    SELECT 1 FROM p2p_vehicles 
    JOIN car_owner_profiles ON car_owner_profiles.id = p2p_vehicles.owner_id
    WHERE p2p_vehicles.id = vehicle_availability.vehicle_id 
    AND car_owner_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage all availability"
  ON vehicle_availability FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

-- P2P Bookings Policies
CREATE POLICY "Renters can view their own bookings"
  ON p2p_bookings FOR SELECT
  USING (auth.uid() = renter_id);

CREATE POLICY "Owners can view bookings for their vehicles"
  ON p2p_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM car_owner_profiles 
    WHERE car_owner_profiles.id = p2p_bookings.owner_id 
    AND car_owner_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can create bookings"
  ON p2p_bookings FOR INSERT
  WITH CHECK (auth.uid() = renter_id);

CREATE POLICY "Renters can update their pending bookings"
  ON p2p_bookings FOR UPDATE
  USING (auth.uid() = renter_id AND status = 'pending');

CREATE POLICY "Owners can update booking status"
  ON p2p_bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM car_owner_profiles 
    WHERE car_owner_profiles.id = p2p_bookings.owner_id 
    AND car_owner_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all bookings"
  ON p2p_bookings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can update all bookings"
  ON p2p_bookings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

-- P2P Reviews Policies
CREATE POLICY "Anyone can view public reviews"
  ON p2p_reviews FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their own reviews"
  ON p2p_reviews FOR SELECT
  USING (auth.uid() = reviewer_id OR auth.uid() = reviewee_id);

CREATE POLICY "Users can create reviews for their bookings"
  ON p2p_reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id AND EXISTS (
    SELECT 1 FROM p2p_bookings 
    WHERE p2p_bookings.id = booking_id 
    AND p2p_bookings.status = 'completed'
    AND (p2p_bookings.renter_id = auth.uid() OR EXISTS (
      SELECT 1 FROM car_owner_profiles 
      WHERE car_owner_profiles.id = p2p_bookings.owner_id 
      AND car_owner_profiles.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Admins can view all reviews"
  ON p2p_reviews FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

-- P2P Payouts Policies
CREATE POLICY "Owners can view their own payouts"
  ON p2p_payouts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM car_owner_profiles 
    WHERE car_owner_profiles.id = p2p_payouts.owner_id 
    AND car_owner_profiles.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all payouts"
  ON p2p_payouts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can manage all payouts"
  ON p2p_payouts FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

-- P2P Disputes Policies
CREATE POLICY "Users can view disputes they raised"
  ON p2p_disputes FOR SELECT
  USING (auth.uid() = raised_by);

CREATE POLICY "Users can view disputes on their bookings"
  ON p2p_disputes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM p2p_bookings 
    WHERE p2p_bookings.id = p2p_disputes.booking_id 
    AND (p2p_bookings.renter_id = auth.uid() OR EXISTS (
      SELECT 1 FROM car_owner_profiles 
      WHERE car_owner_profiles.id = p2p_bookings.owner_id 
      AND car_owner_profiles.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Users can create disputes on their bookings"
  ON p2p_disputes FOR INSERT
  WITH CHECK (auth.uid() = raised_by AND EXISTS (
    SELECT 1 FROM p2p_bookings 
    WHERE p2p_bookings.id = booking_id 
    AND (p2p_bookings.renter_id = auth.uid() OR EXISTS (
      SELECT 1 FROM car_owner_profiles 
      WHERE car_owner_profiles.id = p2p_bookings.owner_id 
      AND car_owner_profiles.user_id = auth.uid()
    ))
  ));

CREATE POLICY "Users can update their own disputes"
  ON p2p_disputes FOR UPDATE
  USING (auth.uid() = raised_by AND status = 'open');

CREATE POLICY "Admins can view all disputes"
  ON p2p_disputes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

CREATE POLICY "Admins can manage all disputes"
  ON p2p_disputes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

-- P2P Commission Settings Policies
CREATE POLICY "Anyone can view active commission settings"
  ON p2p_commission_settings FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage commission settings"
  ON p2p_commission_settings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  ));

-- =============================================
-- 6. HELPER FUNCTIONS
-- =============================================

-- Check if user is a verified car owner
CREATE OR REPLACE FUNCTION is_verified_car_owner(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM car_owner_profiles 
    WHERE user_id = user_uuid 
    AND status = 'verified'
  );
END;
$$;

-- Get owner profile ID for a user
CREATE OR REPLACE FUNCTION get_owner_profile_id(user_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_id UUID;
BEGIN
  SELECT id INTO profile_id 
  FROM car_owner_profiles 
  WHERE user_id = user_uuid;
  RETURN profile_id;
END;
$$;

-- Calculate booking fees
CREATE OR REPLACE FUNCTION calculate_p2p_booking_fees(
  p_daily_rate NUMERIC,
  p_total_days INTEGER,
  p_include_insurance BOOLEAN DEFAULT true
)
RETURNS TABLE(
  subtotal NUMERIC,
  service_fee NUMERIC,
  platform_fee NUMERIC,
  insurance_fee NUMERIC,
  total_amount NUMERIC,
  owner_payout NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal NUMERIC;
  v_service_fee_pct NUMERIC;
  v_platform_fee_pct NUMERIC;
  v_insurance_daily NUMERIC;
  v_service_fee NUMERIC;
  v_platform_fee NUMERIC;
  v_insurance_fee NUMERIC;
  v_total NUMERIC;
  v_payout NUMERIC;
BEGIN
  -- Get active commission settings
  SELECT 
    COALESCE(cs.renter_service_fee_pct, 10),
    COALESCE(cs.owner_commission_pct, 20),
    COALESCE(cs.insurance_daily_fee, 15)
  INTO v_service_fee_pct, v_platform_fee_pct, v_insurance_daily
  FROM p2p_commission_settings cs
  WHERE cs.is_active = true
  LIMIT 1;

  -- Calculate
  v_subtotal := p_daily_rate * p_total_days;
  v_service_fee := ROUND(v_subtotal * (v_service_fee_pct / 100), 2);
  v_platform_fee := ROUND(v_subtotal * (v_platform_fee_pct / 100), 2);
  v_insurance_fee := CASE WHEN p_include_insurance THEN v_insurance_daily * p_total_days ELSE 0 END;
  v_total := v_subtotal + v_service_fee + v_insurance_fee;
  v_payout := v_subtotal - v_platform_fee;

  RETURN QUERY SELECT 
    v_subtotal,
    v_service_fee,
    v_platform_fee,
    v_insurance_fee,
    v_total,
    v_payout;
END;
$$;

-- Update vehicle rating after review
CREATE OR REPLACE FUNCTION update_vehicle_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.review_type = 'renter_to_vehicle' AND NEW.vehicle_id IS NOT NULL THEN
    UPDATE p2p_vehicles
    SET 
      rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM p2p_reviews
        WHERE vehicle_id = NEW.vehicle_id
        AND review_type = 'renter_to_vehicle'
        AND is_public = true
      ),
      review_count = (
        SELECT COUNT(*)
        FROM p2p_reviews
        WHERE vehicle_id = NEW.vehicle_id
        AND review_type = 'renter_to_vehicle'
        AND is_public = true
      )
    WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_vehicle_rating
  AFTER INSERT OR UPDATE ON p2p_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_rating();

-- Update owner stats after booking completes
CREATE OR REPLACE FUNCTION update_owner_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Update vehicle trip count
    UPDATE p2p_vehicles
    SET total_trips = total_trips + 1
    WHERE id = NEW.vehicle_id;
    
    -- Update owner trip count
    UPDATE car_owner_profiles
    SET total_trips = total_trips + 1
    WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_owner_stats
  AFTER UPDATE ON p2p_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_owner_stats();

-- Updated_at trigger function (reuse if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers
CREATE TRIGGER set_updated_at_car_owner_profiles
  BEFORE UPDATE ON car_owner_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_p2p_vehicles
  BEFORE UPDATE ON p2p_vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_p2p_bookings
  BEFORE UPDATE ON p2p_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_p2p_disputes
  BEFORE UPDATE ON p2p_disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_p2p_commission
  BEFORE UPDATE ON p2p_commission_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. STORAGE BUCKETS
-- =============================================

-- Create storage bucket for P2P documents (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'p2p-documents',
  'p2p-documents',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for P2P vehicle images (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'p2p-vehicle-images',
  'p2p-vehicle-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for p2p-documents
CREATE POLICY "Owners can upload their documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'p2p-documents' 
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Owners can view their own documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'p2p-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can view all p2p documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'p2p-documents'
    AND EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND user_roles.role = 'admin'
    )
  );

-- Storage policies for p2p-vehicle-images
CREATE POLICY "Anyone can view vehicle images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'p2p-vehicle-images');

CREATE POLICY "Verified owners can upload vehicle images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'p2p-vehicle-images'
    AND EXISTS (
      SELECT 1 FROM car_owner_profiles 
      WHERE user_id = auth.uid() 
      AND status = 'verified'
    )
  );

CREATE POLICY "Owners can update their vehicle images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'p2p-vehicle-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Owners can delete their vehicle images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'p2p-vehicle-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );