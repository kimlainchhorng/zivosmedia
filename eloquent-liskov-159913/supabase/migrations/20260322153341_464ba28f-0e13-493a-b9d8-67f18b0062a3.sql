-- Allow service role (edge functions) to manage cache and logs
CREATE POLICY "Service can manage cached deals"
  ON public.ai_smart_deals_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can manage refresh logs"
  ON public.ai_deals_refresh_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);