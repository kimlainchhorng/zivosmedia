-- Fix infinite recursion between drivers <-> food_orders RLS policies

-- 1) Create a SECURITY DEFINER helper that checks whether the current user (customer)
--    has an in-progress/ready order with a given driver.
--    Using SECURITY DEFINER avoids evaluating food_orders RLS policies (which reference drivers),
--    breaking the recursion.
CREATE OR REPLACE FUNCTION public.can_customer_view_driver(_driver_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.food_orders fo
    WHERE fo.customer_id = auth.uid()
      AND fo.driver_id = _driver_id
      AND fo.status = ANY (
        ARRAY['in_progress'::public.booking_status, 'ready_for_pickup'::public.booking_status]
      )
  );
$$;

-- 2) Replace the recursive policy on public.drivers
DROP POLICY IF EXISTS "Customers can view their order driver" ON public.drivers;

CREATE POLICY "Customers can view their order driver"
ON public.drivers
FOR SELECT
TO public
USING (public.can_customer_view_driver(drivers.id));
