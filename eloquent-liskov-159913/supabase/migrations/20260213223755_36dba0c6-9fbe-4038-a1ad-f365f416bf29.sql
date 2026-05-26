
-- Add admin SELECT/UPDATE policies for travel_orders
CREATE POLICY "Admins can view all travel orders"
  ON public.travel_orders FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_any_admin(auth.uid()));

CREATE POLICY "Admins can update travel orders"
  ON public.travel_orders FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_any_admin(auth.uid()));

-- Add admin SELECT policies for travel_order_items
CREATE POLICY "Admins can view all travel order items"
  ON public.travel_order_items FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_any_admin(auth.uid()));

-- Add admin SELECT policies for travel_payments
CREATE POLICY "Admins can view all travel payments"
  ON public.travel_payments FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_any_admin(auth.uid()));
