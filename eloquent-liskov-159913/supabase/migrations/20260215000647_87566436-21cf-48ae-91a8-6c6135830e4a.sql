
-- Remove NULL user_id access from client-facing SELECT policies on travel_orders
DROP POLICY IF EXISTS "Users can view own orders" ON public.travel_orders;
CREATE POLICY "Users can view own orders"
  ON public.travel_orders FOR SELECT
  USING (user_id = auth.uid());

-- Remove NULL user_id from INSERT policy (edge function uses service role, doesn't need this)
DROP POLICY IF EXISTS "Users can insert orders" ON public.travel_orders;
CREATE POLICY "Users can insert orders"
  ON public.travel_orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Fix travel_order_items: remove NULL user_id check
DROP POLICY IF EXISTS "Users can view items for own orders" ON public.travel_order_items;
CREATE POLICY "Users can view items for own orders"
  ON public.travel_order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travel_orders
      WHERE travel_orders.id = travel_order_items.order_id
      AND travel_orders.user_id = auth.uid()
    )
  );

-- Fix travel_payments: remove NULL user_id check
DROP POLICY IF EXISTS "Users can view payments for own orders" ON public.travel_payments;
CREATE POLICY "Users can view payments for own orders"
  ON public.travel_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM travel_orders
      WHERE travel_orders.id = travel_payments.order_id
      AND travel_orders.user_id = auth.uid()
    )
  );
