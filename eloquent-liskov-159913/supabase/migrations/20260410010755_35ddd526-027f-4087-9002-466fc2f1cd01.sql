
CREATE TABLE public.customer_payout_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL CHECK (method_type IN ('bank_transfer', 'aba')),
  label TEXT, -- e.g. "My ABA Account", "Chase Bank"
  bank_name TEXT,
  account_number TEXT,
  account_holder_name TEXT,
  aba_account_id TEXT, -- for ABA/KHQR specific ID
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_payout_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payout methods"
  ON public.customer_payout_methods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payout methods"
  ON public.customer_payout_methods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payout methods"
  ON public.customer_payout_methods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own payout methods"
  ON public.customer_payout_methods FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_payout_methods_user ON public.customer_payout_methods(user_id);
