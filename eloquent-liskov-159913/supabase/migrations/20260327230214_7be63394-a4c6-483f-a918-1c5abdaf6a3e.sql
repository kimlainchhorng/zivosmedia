
-- Store orders table
CREATE TABLE public.store_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','receipt_uploaded','payment_confirmed','assigned','picked_up','delivered','cancelled')),
  items JSONB NOT NULL DEFAULT '[]',
  delivery_address TEXT,
  delivery_lat DOUBLE PRECISION,
  delivery_lng DOUBLE PRECISION,
  customer_phone TEXT,
  customer_name TEXT,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  delivery_fee_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  payment_provider TEXT,
  receipt_url TEXT,
  receipt_uploaded_at TIMESTAMPTZ,
  payment_confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  assigned_driver_id UUID,
  driver_picked_up_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_store_orders_store_id ON public.store_orders(store_id);
CREATE INDEX idx_store_orders_customer_id ON public.store_orders(customer_id);
CREATE INDEX idx_store_orders_status ON public.store_orders(status);

-- RLS
ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON public.store_orders FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Customers can insert their own orders
CREATE POLICY "Customers can create orders"
  ON public.store_orders FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Customers can update their own orders (upload receipt)
CREATE POLICY "Customers can update own orders"
  ON public.store_orders FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Admin/store owners can view all orders (via is_admin or store ownership check)
CREATE POLICY "Admins can view all orders"
  ON public.store_orders FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all orders"
  ON public.store_orders FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Storage bucket for order receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-receipts', 'order-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: authenticated users can upload receipts
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'order-receipts');

CREATE POLICY "Anyone can view receipts"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'order-receipts');
