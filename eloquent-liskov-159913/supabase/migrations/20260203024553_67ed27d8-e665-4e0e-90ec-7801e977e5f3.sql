-- Fix the service role policy to be more specific
DROP POLICY IF EXISTS "Service role can manage incident logs" ON public.flight_incident_logs;

-- Service role needs explicit WITH CHECK for INSERT
CREATE POLICY "Service role can insert incident logs"
ON public.flight_incident_logs FOR INSERT
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can update incident logs"
ON public.flight_incident_logs FOR UPDATE
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can read incident logs"
ON public.flight_incident_logs FOR SELECT
USING (auth.jwt() ->> 'role' = 'service_role');