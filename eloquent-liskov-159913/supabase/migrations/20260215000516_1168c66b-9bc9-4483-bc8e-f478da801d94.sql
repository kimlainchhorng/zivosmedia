
-- 1. fraud_thresholds: restrict SELECT to admins only (attackers shouldn't see detection thresholds)
DROP POLICY IF EXISTS "Anyone can read fraud thresholds" ON public.fraud_thresholds;
CREATE POLICY "Admins can read fraud thresholds"
  ON public.fraud_thresholds FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. device_registry: restrict SELECT to own devices only (contains fingerprints, user_agents, user_ids)
DROP POLICY IF EXISTS "Authenticated users can select devices" ON public.device_registry;
CREATE POLICY "Users can select own devices"
  ON public.device_registry FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 3. performance_score_history: restrict to own entity or admin
DROP POLICY IF EXISTS "Users can read own score history" ON public.performance_score_history;
CREATE POLICY "Users can read own score history"
  ON public.performance_score_history FOR SELECT
  USING (
    entity_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- 4. surge_rules: restrict to authenticated only (reduces public scraping surface)
DROP POLICY IF EXISTS "Anyone can read surge rules" ON public.surge_rules;
CREATE POLICY "Authenticated users can read surge rules"
  ON public.surge_rules FOR SELECT TO authenticated
  USING (true);
