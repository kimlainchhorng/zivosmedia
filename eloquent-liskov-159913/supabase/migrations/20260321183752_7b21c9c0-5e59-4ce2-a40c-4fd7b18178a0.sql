-- Allow admins to view all price alerts
CREATE POLICY "Admins can view all price alerts"
  ON public.flight_price_alerts
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));