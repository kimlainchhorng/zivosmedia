-- Allow the Zivo Software SSO client to complete local callback testing.
-- This intentionally does not store or generate the client secret. Provision the
-- raw secret in the Zivo Software Edge Function and store only its sha256 hash
-- in app_integrations.client_secret_hash before production go-live.

update public.app_integrations
set
  allowed_origins = (
    select array_agg(distinct origin order by origin)
    from unnest(coalesce(allowed_origins, array[]::text[]) || array[
      'https://zivosoftware.com',
      'https://www.zivosoftware.com',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ]) as item(origin)
  ),
  redirect_uris = (
    select array_agg(distinct uri order by uri)
    from unnest(coalesce(redirect_uris, array[]::text[]) || array[
      'https://zivosoftware.com/auth/zivosmedia/callback',
      'https://www.zivosoftware.com/auth/zivosmedia/callback',
      'http://localhost:5173/auth/zivosmedia/callback',
      'http://127.0.0.1:5173/auth/zivosmedia/callback'
    ]) as item(uri)
  ),
  status = case
    when client_secret_hash is not null and length(client_secret_hash) = 64 then 'enabled'
    else status
  end,
  enabled = case
    when client_secret_hash is not null and length(client_secret_hash) = 64 then true
    else enabled
  end,
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'local_redirects_added_at', now(),
    'local_redirects_note', 'Allows zivosoftware localhost/127.0.0.1 callback testing.'
  ),
  updated_at = now()
where app_key = 'zivo_software';
