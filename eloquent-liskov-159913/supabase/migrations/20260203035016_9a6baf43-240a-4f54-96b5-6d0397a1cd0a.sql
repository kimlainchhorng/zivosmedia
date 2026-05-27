-- Flight Payment Audit Log table for OTA-grade compliance
CREATE TABLE public.flight_payment_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.flight_bookings(id) ON DELETE CASCADE,
  stripe_event_type TEXT NOT NULL,
  stripe_event_id TEXT,
  stripe_payment_intent_id TEXT,
  duffel_action TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient queries
CREATE INDEX idx_flight_payment_audit_booking ON public.flight_payment_audit_log(booking_id);
CREATE INDEX idx_flight_payment_audit_created ON public.flight_payment_audit_log(created_at DESC);
CREATE INDEX idx_flight_payment_audit_event ON public.flight_payment_audit_log(stripe_event_type);

-- Enable RLS
ALTER TABLE public.flight_payment_audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only read access
CREATE POLICY "Admins can view payment audit logs"
ON public.flight_payment_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Service role can insert
CREATE POLICY "Service role can insert audit logs"
ON public.flight_payment_audit_log
FOR INSERT
WITH CHECK (true);

-- Add refund fields to flight_bookings if missing
ALTER TABLE public.flight_bookings 
ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS refund_processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS dispute_status TEXT,
ADD COLUMN IF NOT EXISTS dispute_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS dispute_id TEXT;