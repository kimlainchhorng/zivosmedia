-- Allow only the dedicated Driver app to request the server-to-server bootstrap
-- bundle. The scope is intentionally not added to the default scope set: an app
-- must ask for it explicitly and the Driver backend consumes the signed document
-- URLs before anything reaches the browser.
UPDATE public.app_integrations
SET allowed_scopes = CASE
  WHEN 'driver:bootstrap' = ANY (allowed_scopes) THEN allowed_scopes
  ELSE array_append(allowed_scopes, 'driver:bootstrap')
END,
updated_at = now()
WHERE app_key = 'zivo_driver';
