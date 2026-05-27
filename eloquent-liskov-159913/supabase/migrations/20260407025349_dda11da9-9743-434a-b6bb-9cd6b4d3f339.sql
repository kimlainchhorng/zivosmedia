
CREATE TABLE IF NOT EXISTS public.merchant_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL DEFAULT 500,
  currency TEXT NOT NULL DEFAULT 'USD',
  paid_via TEXT NOT NULL DEFAULT 'stripe' CHECK (paid_via IN ('stripe', 'khqr')),
  payment_ref TEXT,
  featured_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_boosts ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_merchant_boosts_store ON public.merchant_boosts(store_id, status);
CREATE INDEX idx_merchant_boosts_featured ON public.merchant_boosts(featured_until) WHERE status = 'active';

CREATE POLICY "Store owners can view own boosts" ON public.merchant_boosts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = store_id AND sp.owner_id = auth.uid()));

CREATE POLICY "Store owners can insert boosts" ON public.merchant_boosts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = store_id AND sp.owner_id = auth.uid()));

CREATE POLICY "Store owners can update own boosts" ON public.merchant_boosts
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = store_id AND sp.owner_id = auth.uid()));

-- Helper function: check if a store is currently boosted/featured
CREATE OR REPLACE FUNCTION public.is_store_featured(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.merchant_boosts
    WHERE store_id = p_store_id
      AND status = 'active'
      AND featured_until > now()
  );
$$;
