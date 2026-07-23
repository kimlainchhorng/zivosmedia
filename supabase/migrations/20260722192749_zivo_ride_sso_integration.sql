-- Register the canonical ZIVO Ride customer app with the central Zivosmedia
-- authorization-code + PKCE broker. Client-secret material is intentionally
-- provisioned out of band; this migration never stores a plaintext secret and
-- never disables an integration that an operator has already enabled.

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
  metadata
)
values (
  'ZIVO Ride',
  'zivo_ride',
  'ride.zivosmedia.com',
  array[
    'https://ride.zivosmedia.com',
    'http://localhost:5177',
    'http://127.0.0.1:5177'
  ],
  array[
    'https://ride.zivosmedia.com/auth/callback?source=zivosmedia',
    'http://localhost:5177/auth/callback?source=zivosmedia',
    'http://127.0.0.1:5177/auth/callback?source=zivosmedia'
  ],
  'https://ride.zivosmedia.com',
  'yiedlgoxwjmansszdypf',
  'kimlainchhorng/ZIVO-ride',
  'configuration_pending',
  false,
  jsonb_build_object(
    'role', 'customer ride platform',
    'requires_client_secret', true,
    'auth_flow', 'authorization_code_pkce',
    'registered_at', now()
  )
)
on conflict (app_key) do update
set
  app_name = excluded.app_name,
  domain = excluded.domain,
  allowed_origins = excluded.allowed_origins,
  redirect_uris = excluded.redirect_uris,
  api_base_url = excluded.api_base_url,
  supabase_project_ref = excluded.supabase_project_ref,
  github_repo = excluded.github_repo,
  metadata = coalesce(public.app_integrations.metadata, '{}'::jsonb) || excluded.metadata,
  updated_at = now();

-- The Ride broker must never be partially enabled. Operators provision the
-- matching raw secret only in the Ride backend and write its lowercase SHA-256
-- hash here in the same transaction that flips both enablement fields.
alter table public.app_integrations
  drop constraint if exists app_integrations_zivo_ride_enabled_secret_check;

alter table public.app_integrations
  add constraint app_integrations_zivo_ride_enabled_secret_check
  check (
    app_key <> 'zivo_ride'
    or (
      enabled = false
      and status <> 'enabled'
    )
    or (
      enabled = true
      and status = 'enabled'
      and client_secret_hash is not null
      and client_secret_hash ~ '^[0-9a-f]{64}$'
    )
  );
