-- Add cancellation columns to travel_orders
ALTER TABLE public.travel_orders
ADD COLUMN IF NOT EXISTS cancellation_status TEXT DEFAULT 'none' CHECK (cancellation_status IN ('none', 'requested', 'under_review', 'approved', 'rejected', 'processed')),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES auth.users(id);

-- Add cancellation columns to travel_order_items
ALTER TABLE public.travel_order_items
ADD COLUMN IF NOT EXISTS cancellation_policy TEXT,
ADD COLUMN IF NOT EXISTS cancellable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS supplier_status TEXT DEFAULT 'pending' CHECK (supplier_status IN ('pending', 'confirmed', 'cancelled', 'failed')),
ADD COLUMN IF NOT EXISTS supplier_payload JSONB;

-- Create travel_email_logs table
CREATE TABLE IF NOT EXISTS public.travel_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.travel_orders(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL CHECK (template IN ('booking_confirmation', 'cancellation_request', 'cancellation_update', 'refund_processed')),
  resend_message_id TEXT,
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on travel_email_logs
ALTER TABLE public.travel_email_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view email logs for their own orders
CREATE POLICY "Users can view their order email logs"
ON public.travel_email_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.travel_orders
    WHERE travel_orders.id = travel_email_logs.order_id
    AND travel_orders.user_id = auth.uid()
  )
);

-- RLS: Service role can insert email logs
CREATE POLICY "Service role can insert email logs"
ON public.travel_email_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add policy for users to request cancellation on their own orders
CREATE POLICY "Users can request cancellation on own orders"
ON public.travel_orders
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid() AND
  (
    cancellation_status = 'requested' OR
    cancellation_status = 'none'
  )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_travel_email_logs_order_id ON public.travel_email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_travel_orders_cancellation_status ON public.travel_orders(cancellation_status);
CREATE INDEX IF NOT EXISTS idx_travel_orders_user_status ON public.travel_orders(user_id, status);