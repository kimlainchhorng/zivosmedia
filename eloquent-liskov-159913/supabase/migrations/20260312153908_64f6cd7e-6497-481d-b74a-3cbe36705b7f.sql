
-- Shopping delivery orders table for Walmart/grocery orders
CREATE TABLE public.shopping_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  store text NOT NULL DEFAULT 'Walmart',
  order_type text NOT NULL DEFAULT 'shopping_delivery',
  status text NOT NULL DEFAULT 'pending',
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  delivery_address text,
  delivery_lat numeric(10,7),
  delivery_lng numeric(10,7),
  customer_name text,
  customer_phone text,
  customer_email text,
  receipt_photo_url text,
  driver_notes text,
  placed_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  shopping_started_at timestamptz,
  shopping_completed_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.shopping_orders ENABLE ROW LEVEL SECURITY;

-- Customers can see their own orders
CREATE POLICY "Users can view own shopping orders"
  ON public.shopping_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Customers can create orders
CREATE POLICY "Users can create shopping orders"
  ON public.shopping_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Drivers can view assigned orders
CREATE POLICY "Drivers can view assigned shopping orders"
  ON public.shopping_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = driver_id);

-- Drivers can update assigned orders
CREATE POLICY "Drivers can update assigned shopping orders"
  ON public.shopping_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id);

-- Grants
GRANT SELECT, INSERT ON public.shopping_orders TO authenticated;
GRANT UPDATE (status, receipt_photo_url, driver_notes, accepted_at, shopping_started_at, shopping_completed_at, picked_up_at, delivered_at, cancelled_at, updated_at) ON public.shopping_orders TO authenticated;

-- Index for common queries
CREATE INDEX idx_shopping_orders_user_id ON public.shopping_orders(user_id);
CREATE INDEX idx_shopping_orders_driver_id ON public.shopping_orders(driver_id);
CREATE INDEX idx_shopping_orders_status ON public.shopping_orders(status);
