-- Zivosmedia central identity foundation.
-- Non-destructive: creates server-only registry, one-time auth code, audit,
-- and webhook-event tables for future "Continue with Zivosmedia" integrations.

CREATE TABLE IF NOT EXISTS public.app_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL,
  app_key text NOT NULL UNIQUE,
  domain text,
  allowed_origins text[] NOT NULL DEFAULT ARRAY[]::text[],
  redirect_uris text[] NOT NULL DEFAULT ARRAY[]::text[],
  api_base_url text,
  webhook_url text,
  supabase_project_ref text,
  github_repo text,
  client_secret_hash text,
  allowed_scopes text[] NOT NULL DEFAULT ARRAY['openid', 'profile', 'email']::text[],
  status text NOT NULL DEFAULT 'disabled',
  enabled boolean NOT NULL DEFAULT false,
  owner_contact text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_integrations_status_check
    CHECK (status IN ('enabled', 'disabled', 'maintenance', 'configuration_pending'))
);

CREATE TABLE IF NOT EXISTS public.zivosmedia_auth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_integration_id uuid NOT NULL REFERENCES public.app_integrations(id) ON DELETE RESTRICT,
  code_hash text NOT NULL UNIQUE,
  zivosmedia_user_id uuid NOT NULL,
  redirect_uri text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY['openid', 'profile', 'email']::text[],
  code_challenge text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  nonce text,
  state_hash text,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT zivosmedia_auth_codes_pkce_method_check
    CHECK (code_challenge_method = 'S256'),
  CONSTRAINT zivosmedia_auth_codes_lifecycle_check
    CHECK (used_at IS NULL OR revoked_at IS NULL)
);

CREATE TABLE IF NOT EXISTS public.zivosmedia_auth_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  app_key text,
  app_integration_id uuid REFERENCES public.app_integrations(id) ON DELETE SET NULL,
  zivosmedia_user_id uuid,
  ip_address inet,
  ip_hash text,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  error_code text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_app text NOT NULL,
  target_app text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text,
  signature_status text NOT NULL DEFAULT 'pending',
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  CONSTRAINT platform_webhook_events_status_check
    CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'ignored')),
  CONSTRAINT platform_webhook_events_signature_status_check
    CHECK (signature_status IN ('pending', 'valid', 'invalid', 'not_required'))
);

CREATE INDEX IF NOT EXISTS idx_app_integrations_app_key
  ON public.app_integrations(app_key);

CREATE INDEX IF NOT EXISTS idx_app_integrations_status
  ON public.app_integrations(status, enabled);

CREATE INDEX IF NOT EXISTS idx_zivosmedia_auth_codes_lookup
  ON public.zivosmedia_auth_codes(code_hash, expires_at)
  WHERE used_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_zivosmedia_auth_codes_user
  ON public.zivosmedia_auth_codes(zivosmedia_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_zivosmedia_auth_audit_logs_user
  ON public.zivosmedia_auth_audit_logs(zivosmedia_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_zivosmedia_auth_audit_logs_app
  ON public.zivosmedia_auth_audit_logs(app_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_webhook_events_status
  ON public.platform_webhook_events(status, next_retry_at, created_at);

DROP TRIGGER IF EXISTS set_updated_at_app_integrations ON public.app_integrations;
CREATE TRIGGER set_updated_at_app_integrations
  BEFORE UPDATE ON public.app_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.app_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivosmedia_auth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivosmedia_auth_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.app_integrations FROM anon, authenticated;
REVOKE ALL ON TABLE public.zivosmedia_auth_codes FROM anon, authenticated;
REVOKE ALL ON TABLE public.zivosmedia_auth_audit_logs FROM anon, authenticated;
REVOKE ALL ON TABLE public.platform_webhook_events FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.app_integrations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.zivosmedia_auth_codes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.zivosmedia_auth_audit_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_webhook_events TO service_role;

INSERT INTO public.app_integrations (
  app_name,
  app_key,
  domain,
  allowed_origins,
  redirect_uris,
  api_base_url,
  supabase_project_ref,
  github_repo,
  status,
  enabled,
  metadata
) VALUES
  (
    'Zivo Travel',
    'zivo_travel',
    'zivostravel.com',
    ARRAY['https://zivostravel.com', 'https://www.zivostravel.com'],
    ARRAY['https://zivostravel.com/auth/zivosmedia/callback'],
    'https://zivostravel.com',
    'xbllvmpomorawkcrtbcq',
    'kimlainchhorng/zivostravel',
    'configuration_pending',
    false,
    '{"role":"travel platform","requires_client_secret":true}'::jsonb
  ),
  (
    'Zivo Driver',
    'zivo_driver',
    'zivodriver.com',
    ARRAY['https://zivodriver.com', 'https://www.zivodriver.com'],
    ARRAY['https://zivodriver.com/auth/zivosmedia/callback'],
    'https://zivodriver.com',
    'yiedlgoxwjmansszdypf',
    'kimlainchhorng/zivodriver',
    'configuration_pending',
    false,
    '{"role":"driver platform","requires_client_secret":true}'::jsonb
  ),
  (
    'Zivo Software',
    'zivo_software',
    'zivosoftware.com',
    ARRAY['https://zivosoftware.com', 'https://www.zivosoftware.com'],
    ARRAY['https://zivosoftware.com/auth/zivosmedia/callback'],
    'https://zivosoftware.com',
    'ydxztoresbdeoeijhxww',
    'kimlainchhorng/zivosoftware',
    'configuration_pending',
    false,
    '{"role":"software platform","requires_client_secret":true}'::jsonb
  ),
  (
    'ZIVO Chat',
    'zivo_chat',
    'zivoschat.com',
    ARRAY['https://zivoschat.com', 'https://www.zivoschat.com'],
    ARRAY['https://zivoschat.com/auth/zivosmedia/callback'],
    'https://zivoschat.com',
    'slirphzzwcogdbkeicff',
    'kimlainchhorng/ZIVO-CHAT',
    'configuration_pending',
    false,
    '{"role":"chat platform","requires_client_secret":true}'::jsonb
  )
ON CONFLICT (app_key) DO UPDATE SET
  app_name = EXCLUDED.app_name,
  domain = EXCLUDED.domain,
  allowed_origins = EXCLUDED.allowed_origins,
  redirect_uris = EXCLUDED.redirect_uris,
  api_base_url = EXCLUDED.api_base_url,
  supabase_project_ref = EXCLUDED.supabase_project_ref,
  github_repo = EXCLUDED.github_repo,
  metadata = public.app_integrations.metadata || EXCLUDED.metadata,
  updated_at = now();
