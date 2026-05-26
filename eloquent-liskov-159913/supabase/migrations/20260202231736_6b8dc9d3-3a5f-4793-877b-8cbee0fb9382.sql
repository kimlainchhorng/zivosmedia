-- Create beta launch state enum
CREATE TYPE beta_launch_state AS ENUM ('not_ready', 'ready_for_beta', 'beta_live', 'paused');

-- Create beta launch status table
CREATE TABLE beta_launch_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status beta_launch_state NOT NULL DEFAULT 'not_ready',
  activated_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  notes TEXT,
  activated_by UUID,
  paused_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE beta_launch_status ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can read beta launch status"
  ON beta_launch_status FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update beta launch status"
  ON beta_launch_status FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create beta launch checklist table
CREATE TABLE beta_launch_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Day 1: Platform Check
  day1_homepage_loads BOOLEAN DEFAULT false,
  day1_cars_page_loads BOOLEAN DEFAULT false,
  day1_list_car_page_loads BOOLEAN DEFAULT false,
  day1_login_works BOOLEAN DEFAULT false,
  day1_owner_routing_works BOOLEAN DEFAULT false,
  day1_renter_routing_works BOOLEAN DEFAULT false,
  day1_admin_routing_works BOOLEAN DEFAULT false,
  day1_footer_links_work BOOLEAN DEFAULT false,
  day1_completed_at TIMESTAMPTZ,
  day1_completed_by UUID,
  
  -- Day 2: Payments & Insurance
  day2_stripe_test_payment BOOLEAN DEFAULT false,
  day2_stripe_connect_payout BOOLEAN DEFAULT false,
  day2_commission_deducted BOOLEAN DEFAULT false,
  day2_insurance_disclosure_visible BOOLEAN DEFAULT false,
  day2_completed_at TIMESTAMPTZ,
  day2_completed_by UUID,
  
  -- Day 3: Owner Flow
  day3_owner_signup_works BOOLEAN DEFAULT false,
  day3_vehicle_upload_works BOOLEAN DEFAULT false,
  day3_2018_rule_enforced BOOLEAN DEFAULT false,
  day3_admin_approval_works BOOLEAN DEFAULT false,
  day3_owner_dashboard_shows_data BOOLEAN DEFAULT false,
  day3_completed_at TIMESTAMPTZ,
  day3_completed_by UUID,
  
  -- Day 4: Renter Flow
  day4_renter_signup_works BOOLEAN DEFAULT false,
  day4_license_verification_works BOOLEAN DEFAULT false,
  day4_booking_blocked_without_verification BOOLEAN DEFAULT false,
  day4_confirmation_email_works BOOLEAN DEFAULT false,
  day4_completed_at TIMESTAMPTZ,
  day4_completed_by UUID,
  
  -- Day 5: Disputes & Failsafes
  day5_damage_report_works BOOLEAN DEFAULT false,
  day5_dispute_panel_loads BOOLEAN DEFAULT false,
  day5_payout_hold_works BOOLEAN DEFAULT false,
  day5_cancellation_works BOOLEAN DEFAULT false,
  day5_completed_at TIMESTAMPTZ,
  day5_completed_by UUID,
  
  -- Day 6: City Launch Control
  day6_city_status_live BOOLEAN DEFAULT false,
  day6_only_live_city_cars_shown BOOLEAN DEFAULT false,
  day6_non_live_cities_blocked BOOLEAN DEFAULT false,
  day6_waitlist_shown_when_beta BOOLEAN DEFAULT false,
  day6_completed_at TIMESTAMPTZ,
  day6_completed_by UUID,
  
  -- Day 7: Beta Go Live
  day7_first_renters_invited BOOLEAN DEFAULT false,
  day7_bookings_enabled BOOLEAN DEFAULT false,
  day7_first_transaction_monitored BOOLEAN DEFAULT false,
  day7_support_contact_visible BOOLEAN DEFAULT false,
  day7_completed_at TIMESTAMPTZ,
  day7_completed_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE beta_launch_checklist ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can read beta checklist"
  ON beta_launch_checklist FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update beta checklist"
  ON beta_launch_checklist FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Insert initial rows
INSERT INTO beta_launch_status (status, notes) 
VALUES ('not_ready', 'Initial state');

INSERT INTO beta_launch_checklist DEFAULT VALUES;