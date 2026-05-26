-- Launch hardening: strict merchant RLS, live pulse data, purchase records.

-- 1) Strict merchant isolation for store orders
DROP POLICY IF EXISTS "Store owners can view store orders" ON public.store_orders;
CREATE POLICY "Store owners can view store orders"
  ON public.store_orders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_orders.store_id
        AND sp.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Store owners can update store orders" ON public.store_orders;
CREATE POLICY "Store owners can update store orders"
  ON public.store_orders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_orders.store_id
        AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = store_orders.store_id
        AND sp.owner_id = auth.uid()
    )
  );

-- 2) Strict merchant isolation for truck sales
DROP POLICY IF EXISTS "Store owners can view truck sales" ON public.truck_sales;
CREATE POLICY "Store owners can view truck sales"
  ON public.truck_sales FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = truck_sales.store_id
        AND sp.owner_id = auth.uid()
    )
  );

-- 3) Live pulse cache from purchase activity
CREATE TABLE IF NOT EXISTS public.shop_live_pulse (
  store_id UUID PRIMARY KEY REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  last_purchase_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_event_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_live_pulse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read live pulse" ON public.shop_live_pulse;
CREATE POLICY "Anyone can read live pulse"
  ON public.shop_live_pulse FOR SELECT TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Service role writes live pulse" ON public.shop_live_pulse;
CREATE POLICY "Service role writes live pulse"
  ON public.shop_live_pulse FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 4) Purchase records (transaction id aligned with Meta event_id)
CREATE TABLE IF NOT EXISTS public.purchase_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own purchase records" ON public.purchase_records;
CREATE POLICY "Users can read own purchase records"
  ON public.purchase_records FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service role manages purchase records" ON public.purchase_records;
CREATE POLICY "Service role manages purchase records"
  ON public.purchase_records FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
