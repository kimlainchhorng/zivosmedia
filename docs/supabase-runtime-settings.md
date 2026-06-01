# Supabase Runtime Settings

Some database-side jobs call Supabase Edge Functions from `pg_cron`. Set these
Postgres runtime settings per Supabase project so cloned, staging, and production
databases call their own project instead of falling back to production defaults.

Deploy environment setup guide: `docs/supabase-deploy-env-setup.md`.

Generate the SQL with:

```sh
SUPABASE_URL=https://<project-ref>.supabase.co \
SUPABASE_ANON_KEY=<legacy-anon-or-compatible-function-auth-key> \
npm run supabase:runtime-settings:sql
```

By default, the key is redacted so the command is safe for logs. To emit the
actual SQL you can paste into the Supabase SQL editor, add `-- --emit-secrets`
after the npm script name in a private terminal.

The SQL should look like this:

```sql
alter database postgres set "app.settings.supabase_url" = 'https://<project-ref>.supabase.co';
alter database postgres set "app.settings.supabase_anon_key" = '<legacy-anon-or-compatible-function-auth-key>';

select pg_reload_conf();
```

Use the backend `SUPABASE_ANON_KEY` value for `app.settings.supabase_anon_key`.
Do not use `SUPABASE_SERVICE_ROLE_KEY`, `sb_secret_...`, or `sbp_...`
Supabase management access tokens here.

Then reconnect sessions before relying on `current_setting(...)` in functions or
cron commands. Existing cron commands are patched by
`20260531145613_make_cron_function_urls_project_aware.sql`.

To verify:

```sql
select current_setting('app.settings.supabase_url', true) as supabase_url,
       case
         when current_setting('app.settings.supabase_anon_key', true) is null then 'missing'
         else 'configured'
       end as supabase_anon_key;

select jobname, command
from cron.job
where command like '%app.settings.supabase_%'
order by jobname;
```
