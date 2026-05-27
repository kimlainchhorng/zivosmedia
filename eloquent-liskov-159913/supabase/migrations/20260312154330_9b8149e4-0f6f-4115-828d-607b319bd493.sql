
-- Allow drivers to see unassigned pending shopping orders (for dispatch)
CREATE POLICY "Drivers can view pending unassigned shopping orders"
  ON public.shopping_orders FOR SELECT
  TO authenticated
  USING (
    status = 'pending' AND driver_id IS NULL
    AND EXISTS (SELECT 1 FROM public.drivers WHERE user_id = auth.uid() AND can_go_online = true)
  );

-- Allow drivers to claim (assign themselves to) pending orders
CREATE POLICY "Drivers can claim pending shopping orders"
  ON public.shopping_orders FOR UPDATE
  TO authenticated
  USING (
    status = 'pending' AND driver_id IS NULL
    AND EXISTS (SELECT 1 FROM public.drivers WHERE user_id = auth.uid() AND can_go_online = true)
  )
  WITH CHECK (
    driver_id = (SELECT id FROM public.drivers WHERE user_id = auth.uid() LIMIT 1)
  );

-- Grant UPDATE on driver_id column so drivers can claim
GRANT UPDATE (driver_id) ON public.shopping_orders TO authenticated;
