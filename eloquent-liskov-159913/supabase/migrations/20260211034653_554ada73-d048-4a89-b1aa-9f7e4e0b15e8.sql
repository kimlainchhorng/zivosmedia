
-- Fix admin_login_attempts: drop all permissive INSERT policies
DROP POLICY IF EXISTS "Allow insert for all" ON public.admin_login_attempts;
DROP POLICY IF EXISTS "Allow insert for authenticated" ON public.admin_login_attempts;
DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.admin_login_attempts;
DROP POLICY IF EXISTS "Admins can view login attempts" ON public.admin_login_attempts;

CREATE POLICY "Admins can view login attempts v2"
  ON public.admin_login_attempts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix kyc_events
DROP POLICY IF EXISTS "Authenticated users can insert kyc events" ON public.kyc_events;
DROP POLICY IF EXISTS "Users can insert kyc events" ON public.kyc_events;
DROP POLICY IF EXISTS "Admins can view all KYC events" ON public.kyc_events;
DROP POLICY IF EXISTS "Admins can view all kyc events" ON public.kyc_events;
DROP POLICY IF EXISTS "Users can view own KYC events" ON public.kyc_events;
DROP POLICY IF EXISTS "Users can view own kyc events" ON public.kyc_events;

CREATE POLICY "Users insert own kyc events"
  ON public.kyc_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "View kyc events"
  ON public.kyc_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Fix share_events
DROP POLICY IF EXISTS "Anyone can insert share events" ON public.share_events;
DROP POLICY IF EXISTS "Public insert share events" ON public.share_events;
DROP POLICY IF EXISTS "Allow insert share events" ON public.share_events;
DROP POLICY IF EXISTS "Users can view own share events" ON public.share_events;

CREATE POLICY "Insert own share events"
  ON public.share_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "View own share events"
  ON public.share_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
