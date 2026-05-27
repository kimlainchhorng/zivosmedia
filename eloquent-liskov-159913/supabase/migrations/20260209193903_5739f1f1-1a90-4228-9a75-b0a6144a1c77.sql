
-- Add payment_mode to group_order_sessions
ALTER TABLE public.group_order_sessions ADD COLUMN payment_mode text;

-- Add missing columns to group_order_payments
ALTER TABLE public.group_order_payments ADD COLUMN IF NOT EXISTS user_name text NOT NULL DEFAULT '';
ALTER TABLE public.group_order_payments ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Add session_id as alias referencing group_order_sessions if group_order_id references it
-- First check: rename group_order_id to session_id for consistency
ALTER TABLE public.group_order_payments RENAME COLUMN group_order_id TO session_id;

-- Enable RLS if not already
ALTER TABLE public.group_order_payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any, then recreate
DROP POLICY IF EXISTS "Users can read payments in their sessions" ON public.group_order_payments;
DROP POLICY IF EXISTS "Host can create payments" ON public.group_order_payments;
DROP POLICY IF EXISTS "Users can update own payment" ON public.group_order_payments;

CREATE POLICY "Users can read payments in their sessions"
ON public.group_order_payments
FOR SELECT
USING (
  session_id IN (
    SELECT id FROM public.group_order_sessions WHERE host_user_id = auth.uid()
    UNION
    SELECT DISTINCT session_id FROM public.group_order_items WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Host can create payments"
ON public.group_order_payments
FOR INSERT
WITH CHECK (
  session_id IN (
    SELECT id FROM public.group_order_sessions WHERE host_user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own payment"
ON public.group_order_payments
FOR UPDATE
USING (user_id = auth.uid());

-- Index
CREATE INDEX IF NOT EXISTS idx_group_order_payments_session ON public.group_order_payments(session_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_order_payments;
