-- Register the ZIVO Ride (customer) app for "Continue with Zivosmedia" SSO.
-- Mirrors the zivo_driver registration: PKCE authorization-code flow with a
-- per-app client secret. Only the sha256 hash of the secret is stored here;
-- the raw secret lives in the zivo-ride-auth-exchange Edge Function env on the
-- shared ride/driver Supabase project (yiedlgoxwjmansszdypf).

insert into public.app_integrations (
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
  client_secret_hash,
  metadata
) values (
  'ZIVO Ride',
  'zivo_ride',
  'hizivo.com',
  array[
    'https://hizivo.com',
    'https://www.hizivo.com',
    'http://localhost:5177',
    'http://127.0.0.1:5177'
  ],
  array[
    'https://hizivo.com/auth/callback?source=zivosmedia',
    'https://www.hizivo.com/auth/callback?source=zivosmedia',
    'http://localhost:5177/auth/callback?source=zivosmedia',
    'http://127.0.0.1:5177/auth/callback?source=zivosmedia'
  ],
  'https://hizivo.com',
  'yiedlgoxwjmansszdypf',
  'kimlainchhorng/zivo-ride',
  'enabled',
  true,
  'a235dd5219fcbd19b6e35865a52b05e3e6ebc8ffdc4f05e601ec19b623e22b6b',
  '{"role":"customer ride platform","requires_client_secret":true}'::jsonb
)
on conflict (app_key) do update set
  app_name = excluded.app_name,
  domain = excluded.domain,
  allowed_origins = excluded.allowed_origins,
  redirect_uris = excluded.redirect_uris,
  api_base_url = excluded.api_base_url,
  supabase_project_ref = excluded.supabase_project_ref,
  github_repo = excluded.github_repo,
  status = excluded.status,
  enabled = excluded.enabled,
  client_secret_hash = excluded.client_secret_hash,
  metadata = coalesce(public.app_integrations.metadata, '{}'::jsonb) || excluded.metadata,
  updated_at = now();
