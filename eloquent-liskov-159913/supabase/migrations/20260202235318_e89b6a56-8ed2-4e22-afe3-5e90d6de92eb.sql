-- ===========================================
-- ZIVO Flights: Merchant-of-Record Schema
-- ===========================================

-- 1. Enhance flight_bookings table for MoR model
ALTER TABLE flight_bookings
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS pnr TEXT,
ADD COLUMN IF NOT EXISTS ticket_numbers JSONB,
ADD COLUMN IF NOT EXISTS ticketing_status TEXT DEFAULT 'pending' CHECK (ticketing_status IN ('pending', 'processing', 'issued', 'failed', 'cancelled', 'voided')),
ADD COLUMN IF NOT EXISTS ticketing_partner TEXT,
ADD COLUMN IF NOT EXISTS ticketing_partner_order_id TEXT,
ADD COLUMN IF NOT EXISTS ticketing_error TEXT,
ADD COLUMN IF NOT EXISTS ticketed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS baggage_allowance JSONB,
ADD COLUMN IF NOT EXISTS fare_rules JSONB,
ADD COLUMN IF NOT EXISTS itinerary_email_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS refund_status TEXT CHECK (refund_status IN ('none', 'requested', 'processing', 'refunded', 'denied')),
ADD COLUMN IF NOT EXISTS refund_amount NUMERIC,
ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS base_fare NUMERIC,
ADD COLUMN IF NOT EXISTS taxes_fees NUMERIC,
ADD COLUMN IF NOT EXISTS offer_id TEXT,
ADD COLUMN IF NOT EXISTS offer_expires_at TIMESTAMPTZ;

-- 2. Create flight_passengers table
CREATE TABLE IF NOT EXISTS flight_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES flight_bookings(id) ON DELETE CASCADE,
  passenger_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  given_name TEXT NOT NULL,
  family_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('m', 'f')),
  born_on DATE NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  passport_country TEXT,
  nationality TEXT,
  ticket_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(booking_id, passenger_index)
);

-- Enable RLS on flight_passengers
ALTER TABLE flight_passengers ENABLE ROW LEVEL SECURITY;

-- Users can view their own passengers
CREATE POLICY "Users can view their own passengers"
  ON flight_passengers FOR SELECT TO authenticated
  USING (booking_id IN (SELECT id FROM flight_bookings WHERE customer_id = auth.uid()));

-- Users can insert passengers for their own bookings
CREATE POLICY "Users can insert their own passengers"
  ON flight_passengers FOR INSERT TO authenticated
  WITH CHECK (booking_id IN (SELECT id FROM flight_bookings WHERE customer_id = auth.uid()));

-- Admins can view all passengers
CREATE POLICY "Admins can view all passengers"
  ON flight_passengers FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. Create flight_ticketing_logs table
CREATE TABLE IF NOT EXISTS flight_ticketing_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES flight_bookings(id),
  action TEXT NOT NULL,
  partner TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on flight_ticketing_logs
ALTER TABLE flight_ticketing_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all ticketing logs
CREATE POLICY "Admins can manage ticketing logs"
  ON flight_ticketing_logs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_flight_bookings_stripe_session ON flight_bookings(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_payment_intent ON flight_bookings(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_pnr ON flight_bookings(pnr);
CREATE INDEX IF NOT EXISTS idx_flight_bookings_ticketing_status ON flight_bookings(ticketing_status);
CREATE INDEX IF NOT EXISTS idx_flight_passengers_booking ON flight_passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_flight_ticketing_logs_booking ON flight_ticketing_logs(booking_id);