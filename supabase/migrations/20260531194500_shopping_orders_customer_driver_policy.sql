-- Tighten customer grocery order updates and repair assigned-driver access.
-- shopping_orders.driver_id references public.drivers(id), so assigned-driver
-- policies must map auth.uid() through the drivers table.

DROP POLICY IF EXISTS "Users can update own shopping orders" ON public.shopping_orders;
CREATE POLICY "Users can update own shopping orders"
  ON public.shopping_orders
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND status IN ('pending_payment', 'pending', 'confirmed')
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND status IN ('pending_payment', 'pending', 'confirmed', 'cancelled')
  );

DROP POLICY IF EXISTS "Drivers can view assigned shopping orders" ON public.shopping_orders;
CREATE POLICY "Drivers can view assigned shopping orders"
  ON public.shopping_orders
  FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT d.id
      FROM public.drivers d
      WHERE d.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Drivers can update assigned shopping orders" ON public.shopping_orders;
CREATE POLICY "Drivers can update assigned shopping orders"
  ON public.shopping_orders
  FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT d.id
      FROM public.drivers d
      WHERE d.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    driver_id IN (
      SELECT d.id
      FROM public.drivers d
      WHERE d.user_id = (SELECT auth.uid())
    )
  );

GRANT UPDATE (
  status,
  receipt_photo_url,
  driver_notes,
  rating,
  accepted_at,
  shopping_started_at,
  shopping_completed_at,
  picked_up_at,
  delivered_at,
  cancelled_at,
  updated_at
) ON public.shopping_orders TO authenticated;
