-- 1. PRICE_ALERTS: Remove guest email exposure clause
DROP POLICY IF EXISTS "Users can view their own alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Users can update their own alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Users can delete their own alerts" ON public.price_alerts;

CREATE POLICY "Users can view their own alerts" ON public.price_alerts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON public.price_alerts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts" ON public.price_alerts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. JOB_OTPS: Remove client-readable OTP, create safe view
DROP POLICY IF EXISTS "Customer can read own otp mask" ON public.job_otps;

CREATE OR REPLACE VIEW public.job_otps_safe AS
  SELECT job_id, otp_last4, created_at, expires_at, verified_at
  FROM public.job_otps;

ALTER VIEW public.job_otps_safe SET (security_invoker = true);
GRANT SELECT ON public.job_otps_safe TO authenticated;

-- Scoped admin-only SELECT on base table
CREATE POLICY "Admins can read job otps" ON public.job_otps
  FOR SELECT TO authenticated
  USING (is_admin(auth.uid()));