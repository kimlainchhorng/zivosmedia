
CREATE TABLE IF NOT EXISTS public.marketplace_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source_platform public.marketplace_source_platform NOT NULL DEFAULT 'manual',
  source_url TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT,
  weight_grams INTEGER NOT NULL DEFAULT 500,
  source_price NUMERIC(12,2),
  source_currency TEXT DEFAULT 'CNY',
  markup_percent NUMERIC(5,2) NOT NULL DEFAULT 30,
  final_price_cents INTEGER NOT NULL,
  est_delivery_days_min INTEGER NOT NULL DEFAULT 7,
  est_delivery_days_max INTEGER NOT NULL DEFAULT 14,
  active BOOLEAN NOT NULL DEFAULT true,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE POLICY "Active products viewable" ON public.marketplace_products
  FOR SELECT USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage products" ON public.marketplace_products
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_mp_products_updated BEFORE UPDATE ON public.marketplace_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
