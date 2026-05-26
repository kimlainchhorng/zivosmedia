-- Admin wallet ledger for settlement-grade platform fee tracing.

CREATE TABLE IF NOT EXISTS public.admin_wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_wallet_ledger_tx_source_uidx
  ON public.admin_wallet_ledger (transaction_id, source_type, source_id);

ALTER TABLE public.admin_wallet_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages admin wallet ledger" ON public.admin_wallet_ledger;
CREATE POLICY "Service role manages admin wallet ledger"
  ON public.admin_wallet_ledger FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can read admin wallet ledger" ON public.admin_wallet_ledger;
CREATE POLICY "Admins can read admin wallet ledger"
  ON public.admin_wallet_ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
