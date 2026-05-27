-- Merchant payouts table
CREATE TABLE IF NOT EXISTS public.merchant_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  merchant_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 500),
  bank_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_payouts ENABLE ROW LEVEL SECURITY;

-- Merchants can view their own payouts
CREATE POLICY "Merchants can view own payouts"
  ON public.merchant_payouts FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

-- Merchants can create payout requests for themselves
CREATE POLICY "Merchants can request payouts"
  ON public.merchant_payouts FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = auth.uid());

-- Index for fast lookups
CREATE INDEX idx_merchant_payouts_store ON public.merchant_payouts(store_id);
CREATE INDEX idx_merchant_payouts_merchant ON public.merchant_payouts(merchant_id);