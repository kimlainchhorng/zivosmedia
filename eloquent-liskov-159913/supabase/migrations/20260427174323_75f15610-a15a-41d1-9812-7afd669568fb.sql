-- 1) Per-store payout methods: a host who manages multiple properties can have different bank accounts per property.
ALTER TABLE public.customer_payout_methods
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS rail text;

CREATE INDEX IF NOT EXISTS idx_customer_payout_methods_store ON public.customer_payout_methods(store_id);

-- Allow store owners to manage payout methods scoped to a store they own.
DROP POLICY IF EXISTS "Store owners manage their store payout methods" ON public.customer_payout_methods;
CREATE POLICY "Store owners manage their store payout methods"
  ON public.customer_payout_methods
  FOR ALL
  USING (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_id AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    store_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_id AND sp.owner_id = auth.uid()
    )
  );

-- 2) Lodge payout requests: queue admins review and fulfil manually, regardless of rail.
CREATE TABLE IF NOT EXISTS public.lodge_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  rail text NOT NULL,                 -- stripe | aba | bank_wire | paypal
  payout_method_id uuid REFERENCES public.customer_payout_methods(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | paid | rejected | cancelled
  admin_note text,
  reference text,                     -- payment reference (e.g. Stripe transfer id, ABA receipt no.)
  note text,                          -- host-provided note
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_lodge_payout_requests_store ON public.lodge_payout_requests(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lodge_payout_requests_status ON public.lodge_payout_requests(status, created_at DESC);

ALTER TABLE public.lodge_payout_requests ENABLE ROW LEVEL SECURITY;

-- Store owners can view & create requests for stores they own
DROP POLICY IF EXISTS "Store owners view own payout requests" ON public.lodge_payout_requests;
CREATE POLICY "Store owners view own payout requests"
  ON public.lodge_payout_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_id AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners create payout requests" ON public.lodge_payout_requests;
CREATE POLICY "Store owners create payout requests"
  ON public.lodge_payout_requests
  FOR INSERT
  WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_id AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners cancel pending payout requests" ON public.lodge_payout_requests;
CREATE POLICY "Store owners cancel pending payout requests"
  ON public.lodge_payout_requests
  FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_id AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (status IN ('pending','cancelled'));

-- Admins can manage everything
DROP POLICY IF EXISTS "Admins manage lodge payout requests" ON public.lodge_payout_requests;
CREATE POLICY "Admins manage lodge payout requests"
  ON public.lodge_payout_requests
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
DROP TRIGGER IF EXISTS update_lodge_payout_requests_updated_at ON public.lodge_payout_requests;
CREATE TRIGGER update_lodge_payout_requests_updated_at
  BEFORE UPDATE ON public.lodge_payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();