-- Allow the Zivo Driver SSO client to complete local callback testing.
-- The app uses /auth/callback?source=zivosmedia for the web PKCE return path.

update public.app_integrations
set
  allowed_origins = (
    select array_agg(distinct origin order by origin)
    from unnest(coalesce(allowed_origins, array[]::text[]) || array[
      'https://zivodriver.com',
      'https://www.zivodriver.com',
      'http://localhost:5176',
      'http://127.0.0.1:5176'
    ]) as item(origin)
  ),
  redirect_uris = (
    select array_agg(distinct uri order by uri)
    from unnest(coalesce(redirect_uris, array[]::text[]) || array[
      'https://zivodriver.com/auth/callback?source=zivosmedia',
      'https://www.zivodriver.com/auth/callback?source=zivosmedia',
      'https://zivodriver.com/auth/zivosmedia/callback',
      'http://localhost:5176/auth/callback?source=zivosmedia',
      'http://127.0.0.1:5176/auth/callback?source=zivosmedia'
    ]) as item(uri)
  ),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
    'local_redirects_added_at', now(),
    'local_redirects_note', 'Allows zivodriver localhost/127.0.0.1 callback testing.'
  ),
  updated_at = now()
where app_key = 'zivo_driver';
