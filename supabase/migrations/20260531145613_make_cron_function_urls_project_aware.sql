-- Rewrite existing pg_cron commands so Edge Function calls are project-aware.
-- Historical migrations scheduled some jobs against one concrete Supabase host
-- and embedded a legacy anon JWT in Authorization headers.
-- Keeping this as a forward migration preserves history while making rebuilt
-- databases and cloned environments honor app.settings.supabase_url and
-- app.settings.supabase_anon_key when those settings are configured.

DO $$
DECLARE
  old_base text := 'https://' || 'slirphzzwcogdbkeicff' || '.supabase.co';
  setting_expr text := 'COALESCE(current_setting(''app.settings.supabase_url'', true), ' || quote_literal(old_base) || ')';
  url_updated_count integer := 0;
  json_header_updated_count integer := 0;
  build_object_header_updated_count integer := 0;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'Skipping cron URL rewrite because cron.job is not available.';
    RETURN;
  END IF;

  UPDATE cron.job
  SET command = replace(
    command,
    quote_literal(old_base || '/functions/v1/'),
    setting_expr || ' || ''/functions/v1/'
  )
  WHERE command LIKE '%' || old_base || '/functions/v1/%'
    AND command NOT LIKE '%app.settings.supabase_url%';

  GET DIAGNOSTICS url_updated_count = ROW_COUNT;

  UPDATE cron.job
  SET command = regexp_replace(
    command,
    'headers[[:space:]]*:=[[:space:]]*''(\{[^'']*"Authorization"[[:space:]]*:[[:space:]]*"Bearer )([^"]+)("[^'']*\})''::jsonb',
    'headers := (''\1'' || COALESCE(current_setting(''app.settings.supabase_anon_key'', true), ''\2'') || ''\3'')::jsonb',
    'g'
  )
  WHERE command LIKE '%Authorization%Bearer eyJ%'
    AND command NOT LIKE '%app.settings.supabase_anon_key%';

  GET DIAGNOSTICS json_header_updated_count = ROW_COUNT;

  UPDATE cron.job
  SET command = regexp_replace(
    command,
    '(''Authorization''[[:space:]]*,[[:space:]]*)''Bearer ([^'']+)''',
    '\1(''Bearer '' || COALESCE(current_setting(''app.settings.supabase_anon_key'', true), ''\2''))',
    'g'
  )
  WHERE command LIKE '%Authorization%Bearer eyJ%'
    AND command NOT LIKE '%app.settings.supabase_anon_key%';

  GET DIAGNOSTICS build_object_header_updated_count = ROW_COUNT;

  RAISE NOTICE 'Rewrote % pg_cron command(s) to use app.settings.supabase_url.', url_updated_count;
  RAISE NOTICE 'Rewrote % JSON header command(s) and % jsonb_build_object header command(s) to use app.settings.supabase_anon_key.',
    json_header_updated_count,
    build_object_header_updated_count;
END $$;
