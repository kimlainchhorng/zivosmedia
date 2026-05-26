-- Add RLS policies to tables that have RLS enabled but no policies

-- 1. zivo_partner_commissions - Admin only access for commission data
CREATE POLICY "Admins can manage partner commissions"
ON public.zivo_partner_commissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. zivo_payout_schedules - Admin only access for payout schedules
CREATE POLICY "Admins can manage payout schedules"
ON public.zivo_payout_schedules
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. zivo_revenue - Admin only access for revenue data
CREATE POLICY "Admins can manage revenue"
ON public.zivo_revenue
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. zivo_revenue_daily - Admin only access for daily revenue data
CREATE POLICY "Admins can manage daily revenue"
ON public.zivo_revenue_daily
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));