-- Add missing columns to flight_bookings table for MoR checkout flow
ALTER TABLE public.flight_bookings 
ADD COLUMN IF NOT EXISTS origin text,
ADD COLUMN IF NOT EXISTS destination text,
ADD COLUMN IF NOT EXISTS departure_date date,
ADD COLUMN IF NOT EXISTS return_date date,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS refund_status text,
ADD COLUMN IF NOT EXISTS refund_amount numeric,
ADD COLUMN IF NOT EXISTS refund_processed_at timestamptz,
ADD COLUMN IF NOT EXISTS refund_reason text;