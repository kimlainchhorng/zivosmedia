-- Drop and recreate the admin update policy that already existed
DROP POLICY IF EXISTS "Admins can update all bookings" ON public.p2p_bookings;

-- Recreate admin update policy
CREATE POLICY "Admins can update all bookings"
ON public.p2p_bookings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));