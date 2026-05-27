-- ========================================
-- Car Rental Level 2: Deposits, Insurance, Cancellation
-- ========================================

-- Add deposit_amount and cancellation_policy to p2p_vehicles
ALTER TABLE public.p2p_vehicles
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 300.00,
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT DEFAULT 'flexible' CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict'));

-- Add deposit tracking to p2p_bookings
ALTER TABLE public.p2p_bookings
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_status TEXT DEFAULT 'not_required' CHECK (deposit_status IN ('not_required', 'authorized', 'captured', 'released', 'partially_captured')),
ADD COLUMN IF NOT EXISTS deposit_captured_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_authorized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deposit_released_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deposit_stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS rental_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rental_completed_by TEXT CHECK (rental_completed_by IN ('owner', 'system', 'admin')),
ADD COLUMN IF NOT EXISTS rental_completion_notes TEXT;

-- Add verified status tracking to renter_profiles
ALTER TABLE public.renter_profiles
ADD COLUMN IF NOT EXISTS booking_blocked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- Create deposit events log table
CREATE TABLE IF NOT EXISTS public.p2p_deposit_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.p2p_bookings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('authorized', 'captured', 'partially_captured', 'released', 'refunded', 'failed')),
  amount DECIMAL(10,2) NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.p2p_deposit_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own deposit events
CREATE POLICY "Users can view their booking deposit events"
ON public.p2p_deposit_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM p2p_bookings b
    WHERE b.id = booking_id
    AND (b.renter_id = auth.uid() OR b.owner_id IN (
      SELECT id FROM car_owner_profiles WHERE user_id = auth.uid()
    ))
  )
);

-- Admins can manage deposit events
CREATE POLICY "Admins can manage deposit events"
ON public.p2p_deposit_events
FOR ALL
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_p2p_deposit_events_booking ON public.p2p_deposit_events(booking_id);
CREATE INDEX IF NOT EXISTS idx_p2p_bookings_deposit_status ON public.p2p_bookings(deposit_status);
CREATE INDEX IF NOT EXISTS idx_p2p_vehicles_cancellation ON public.p2p_vehicles(cancellation_policy);

-- Add damage deduction to damage reports
ALTER TABLE public.p2p_damage_reports
ADD COLUMN IF NOT EXISTS deposit_deduction_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS deposit_deduction_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deposit_deduction_approved_by UUID;