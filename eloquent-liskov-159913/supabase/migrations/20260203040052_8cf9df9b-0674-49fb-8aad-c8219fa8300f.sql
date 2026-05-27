-- Flight email logs table for tracking delivery
CREATE TABLE IF NOT EXISTS public.flight_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.flight_bookings(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resend_id TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for booking lookups
CREATE INDEX IF NOT EXISTS idx_flight_email_logs_booking ON public.flight_email_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_flight_email_logs_status ON public.flight_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_flight_email_logs_type ON public.flight_email_logs(email_type);

-- Enable RLS
ALTER TABLE public.flight_email_logs ENABLE ROW LEVEL SECURITY;

-- Admin can view all logs
CREATE POLICY "Admins can view flight email logs"
ON public.flight_email_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add email type enum comment
COMMENT ON COLUMN public.flight_email_logs.email_type IS 'booking_confirmation, payment_receipt, booking_failed, schedule_change, refund_requested, refund_approved, refund_completed';