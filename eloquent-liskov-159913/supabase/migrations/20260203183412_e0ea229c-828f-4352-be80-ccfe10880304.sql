-- ZIVO Booking Engine: Orders, Order Items, Payments, Audit Logs
-- Phase 1: Database Schema for Hotelbeds Integration

-- 1. Travel Orders table
CREATE TABLE public.travel_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  taxes NUMERIC(10,2) NOT NULL DEFAULT 0,
  fees NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_payment', 'confirmed', 'cancelled', 'failed', 'refunded')),
  provider TEXT NOT NULL DEFAULT 'hotelbeds',
  holder_name TEXT NOT NULL,
  holder_email TEXT NOT NULL,
  holder_phone TEXT,
  stripe_checkout_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Travel Order Items table
CREATE TABLE public.travel_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.travel_orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('hotel', 'activity', 'transfer')),
  provider TEXT NOT NULL DEFAULT 'hotelbeds',
  provider_reference TEXT,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  adults INTEGER NOT NULL DEFAULT 1,
  children INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'cancelled', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Travel Payments table
CREATE TABLE public.travel_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.travel_orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Booking Audit Logs table
CREATE TABLE public.booking_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.travel_orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create order number generator function
CREATE OR REPLACE FUNCTION public.generate_travel_order_number()
RETURNS TRIGGER AS $$
DECLARE
  year_str TEXT;
  random_num TEXT;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');
  random_num := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  NEW.order_number := 'ZIVO-' || year_str || '-' || random_num;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Create trigger for order number generation
CREATE TRIGGER set_travel_order_number
  BEFORE INSERT ON public.travel_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_travel_order_number();

-- 7. Create updated_at trigger for travel_orders
CREATE TRIGGER update_travel_orders_updated_at
  BEFORE UPDATE ON public.travel_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Create indexes for performance
CREATE INDEX idx_travel_orders_user_id ON public.travel_orders(user_id);
CREATE INDEX idx_travel_orders_status ON public.travel_orders(status);
CREATE INDEX idx_travel_orders_order_number ON public.travel_orders(order_number);
CREATE INDEX idx_travel_orders_stripe_session ON public.travel_orders(stripe_checkout_session_id);
CREATE INDEX idx_travel_order_items_order_id ON public.travel_order_items(order_id);
CREATE INDEX idx_travel_order_items_type ON public.travel_order_items(type);
CREATE INDEX idx_travel_payments_order_id ON public.travel_payments(order_id);
CREATE INDEX idx_travel_payments_stripe_session ON public.travel_payments(stripe_checkout_session_id);
CREATE INDEX idx_booking_audit_logs_order_id ON public.booking_audit_logs(order_id);
CREATE INDEX idx_booking_audit_logs_event ON public.booking_audit_logs(event);

-- 9. Enable RLS
ALTER TABLE public.travel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_audit_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for travel_orders
CREATE POLICY "Users can view own orders"
  ON public.travel_orders FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can insert orders"
  ON public.travel_orders FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can update own orders"
  ON public.travel_orders FOR UPDATE
  USING (user_id = auth.uid());

-- 11. RLS Policies for travel_order_items
CREATE POLICY "Users can view items for own orders"
  ON public.travel_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.travel_orders 
    WHERE id = travel_order_items.order_id 
    AND (user_id = auth.uid() OR user_id IS NULL)
  ));

-- 12. RLS Policies for travel_payments
CREATE POLICY "Users can view payments for own orders"
  ON public.travel_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.travel_orders 
    WHERE id = travel_payments.order_id 
    AND (user_id = auth.uid() OR user_id IS NULL)
  ));

-- 13. RLS Policies for booking_audit_logs (admin only)
CREATE POLICY "Admins can view audit logs"
  ON public.booking_audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));