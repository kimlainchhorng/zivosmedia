-- Add missing columns to p2p_bookings for payment tracking
ALTER TABLE public.p2p_bookings
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_status TEXT,
  ADD COLUMN IF NOT EXISTS refund_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES public.p2p_payouts(id);

-- Create index for checkout session lookups
CREATE INDEX IF NOT EXISTS idx_p2p_bookings_checkout_session ON public.p2p_bookings(stripe_checkout_session_id);

-- Create index for payout lookups
CREATE INDEX IF NOT EXISTS idx_p2p_bookings_payout ON public.p2p_bookings(payout_id);

-- Add processed_by and booking_ids to p2p_payouts if not exists
ALTER TABLE public.p2p_payouts
  ADD COLUMN IF NOT EXISTS processed_by UUID,
  ADD COLUMN IF NOT EXISTS booking_ids UUID[];