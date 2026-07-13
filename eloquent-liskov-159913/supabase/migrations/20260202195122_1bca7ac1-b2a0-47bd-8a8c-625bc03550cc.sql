-- Add payout eligibility tracking to bookings
ALTER TABLE p2p_bookings ADD COLUMN IF NOT EXISTS payout_eligible_at timestamptz;
ALTER TABLE p2p_bookings ADD COLUMN IF NOT EXISTS payout_hold_reason text;

-- Add hold tracking to payouts
ALTER TABLE p2p_payouts ADD COLUMN IF NOT EXISTS is_held boolean DEFAULT false;
ALTER TABLE p2p_payouts ADD COLUMN IF NOT EXISTS held_reason text;
ALTER TABLE p2p_payouts ADD COLUMN IF NOT EXISTS held_at timestamptz;
ALTER TABLE p2p_payouts ADD COLUMN IF NOT EXISTS held_by uuid REFERENCES auth.users(id);

-- Add Stripe Connect status fields to owner profiles
ALTER TABLE car_owner_profiles ADD COLUMN IF NOT EXISTS stripe_account_currency text DEFAULT 'usd';
ALTER TABLE car_owner_profiles ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean DEFAULT false;
ALTER TABLE car_owner_profiles ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean DEFAULT false;

-- Add unique constraint to commission settings name if not exists
ALTER TABLE p2p_commission_settings 
  ADD CONSTRAINT p2p_commission_settings_name_key UNIQUE (name);

-- Ensure commission settings has a default row
INSERT INTO p2p_commission_settings (name, owner_commission_pct, renter_service_fee_pct, insurance_daily_fee, is_active)
VALUES ('default', 20, 10, 15, true)
ON CONFLICT (name) DO NOTHING;