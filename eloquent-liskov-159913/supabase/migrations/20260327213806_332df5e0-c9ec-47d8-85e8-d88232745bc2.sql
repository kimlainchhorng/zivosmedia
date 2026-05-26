-- Fix function search path
ALTER FUNCTION public.update_payment_method_timestamp() SET search_path = public;

-- Fix overly permissive RLS - restrict to admin users via is_admin() helper
DROP POLICY "Authenticated users can manage payment methods" ON public.store_payment_methods;

CREATE POLICY "Admins can manage payment methods"
  ON public.store_payment_methods
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));