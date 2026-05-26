
-- 1. truck_sales table
CREATE TABLE IF NOT EXISTS public.truck_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  driver_user_id UUID,
  truck_label TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending',
  is_offline_synced BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.truck_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can insert truck_sales" ON public.truck_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view own truck_sales" ON public.truck_sales FOR SELECT TO authenticated USING (driver_user_id = auth.uid());
CREATE POLICY "Users can update own truck_sales" ON public.truck_sales FOR UPDATE TO authenticated USING (driver_user_id = auth.uid());

-- 2. truck_sale_items table
CREATE TABLE IF NOT EXISTS public.truck_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.truck_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.truck_sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can insert truck_sale_items" ON public.truck_sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can view own truck_sale_items" ON public.truck_sale_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.truck_sales ts WHERE ts.id = sale_id AND ts.driver_user_id = auth.uid()));

-- 3. merchant_ad_spend table
CREATE TABLE IF NOT EXISTS public.merchant_ad_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  reel_id TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT NOT NULL DEFAULT 'boost',
  stripe_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchant_ad_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view own ad spend" ON public.merchant_ad_spend FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = store_id AND sp.owner_id = auth.uid()));
CREATE POLICY "Auth users can insert ad spend" ON public.merchant_ad_spend FOR INSERT TO authenticated WITH CHECK (true);

-- 4. map_pin_clicks table
CREATE TABLE IF NOT EXISTS public.map_pin_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  user_id UUID,
  source TEXT NOT NULL DEFAULT 'map',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.map_pin_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert map_pin_clicks" ON public.map_pin_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own map_pin_clicks" ON public.map_pin_clicks FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_map_pin_clicks_store ON public.map_pin_clicks(store_id);
CREATE INDEX idx_map_pin_clicks_created ON public.map_pin_clicks(created_at);

-- 5. Trigger function for Meta CAPI bridge
CREATE OR REPLACE FUNCTION public.notify_meta_capi_bridge()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payload JSONB;
BEGIN
  _payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', row_to_json(NEW)::jsonb,
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END
  );

  -- Use pg_net to call edge function
  PERFORM net.http_post(
    url := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/meta-capi-bridge',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := _payload
  );

  RETURN NEW;
END;
$$;

-- 6. Triggers
CREATE TRIGGER truck_sales_meta_capi
  AFTER UPDATE ON public.truck_sales
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.notify_meta_capi_bridge();

DROP TRIGGER IF EXISTS store_orders_meta_capi ON public.store_orders;
CREATE TRIGGER store_orders_meta_capi
  AFTER UPDATE ON public.store_orders
  FOR EACH ROW
  WHEN (
    NEW.status IN ('completed', 'delivered', 'payment_confirmed')
    AND OLD.status IS DISTINCT FROM NEW.status
  )
  EXECUTE FUNCTION public.notify_meta_capi_bridge();
