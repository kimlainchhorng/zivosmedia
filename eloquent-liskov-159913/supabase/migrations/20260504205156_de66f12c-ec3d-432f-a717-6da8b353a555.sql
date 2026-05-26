
CREATE TABLE public.import_products (
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
CREATE INDEX idx_imp_products_active ON public.import_products(active, featured);
CREATE INDEX idx_imp_products_category ON public.import_products(category);
CREATE POLICY "Active import products viewable" ON public.import_products
  FOR SELECT USING (active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage import products" ON public.import_products
  FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_imp_products_updated BEFORE UPDATE ON public.import_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.import_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  surcharge_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  payment_method public.marketplace_payment_method NOT NULL DEFAULT 'card',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_intent_id TEXT,
  fulfillment_status public.marketplace_fulfillment_status NOT NULL DEFAULT 'awaiting_payment',
  supplier_tracking TEXT,
  intl_tracking TEXT,
  local_tracking TEXT,
  warehouse_id UUID REFERENCES public.warehouses(id),
  assigned_driver_id UUID,
  delivery_address TEXT NOT NULL,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  contact_name TEXT,
  contact_phone TEXT,
  notes TEXT,
  tracking_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_imp_orders_customer ON public.import_orders(customer_id, created_at DESC);
CREATE INDEX idx_imp_orders_status ON public.import_orders(fulfillment_status);
CREATE INDEX idx_imp_orders_driver ON public.import_orders(assigned_driver_id);
CREATE POLICY "View own/driver/admin import orders" ON public.import_orders FOR SELECT
  USING (auth.uid()=customer_id OR auth.uid()=assigned_driver_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Customers create import orders" ON public.import_orders FOR INSERT
  WITH CHECK (auth.uid()=customer_id);
CREATE POLICY "Admins/drivers update import orders" ON public.import_orders FOR UPDATE
  USING (public.has_role(auth.uid(),'admin') OR auth.uid()=assigned_driver_id);
CREATE POLICY "Admins delete import orders" ON public.import_orders FOR DELETE
  USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_imp_orders_updated BEFORE UPDATE ON public.import_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.import_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.import_orders(id) ON DELETE CASCADE,
  status public.marketplace_fulfillment_status NOT NULL,
  note TEXT,
  photo_url TEXT,
  actor_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_imp_events_order ON public.import_order_events(order_id, created_at DESC);
CREATE POLICY "View events on accessible import orders" ON public.import_order_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.import_orders o WHERE o.id=order_id
    AND (o.customer_id=auth.uid() OR o.assigned_driver_id=auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "Admins/drivers add import events" ON public.import_order_events FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.import_orders o WHERE o.id=order_id AND o.assigned_driver_id=auth.uid()));
