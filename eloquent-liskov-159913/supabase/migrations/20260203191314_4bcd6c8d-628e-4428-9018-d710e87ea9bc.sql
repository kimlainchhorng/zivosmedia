-- Create supplier_payouts table (for supplier reconciliation)
CREATE TABLE IF NOT EXISTS public.supplier_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_sales numeric NOT NULL DEFAULT 0,
  net_sales numeric NOT NULL DEFAULT 0,
  zivo_revenue numeric NOT NULL DEFAULT 0,
  total_orders integer DEFAULT 0,
  total_refunds numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  reconciled_at timestamptz,
  reconciled_by uuid,
  notes text,
  meta jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on supplier_payouts
ALTER TABLE public.supplier_payouts ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplier_payouts (admin only)
CREATE POLICY "Admins can view supplier payouts"
ON public.supplier_payouts FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
);

CREATE POLICY "Admins can manage supplier payouts"
ON public.supplier_payouts FOR ALL
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'finance'))
);

-- Create indexes for supplier_payouts
CREATE INDEX IF NOT EXISTS idx_supplier_payouts_provider ON public.supplier_payouts(provider);
CREATE INDEX IF NOT EXISTS idx_supplier_payouts_status ON public.supplier_payouts(status);
CREATE INDEX IF NOT EXISTS idx_supplier_payouts_period ON public.supplier_payouts(period_start, period_end);