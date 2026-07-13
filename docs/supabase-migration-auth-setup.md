# Supabase Migration Auth Setup

The local migration checker can audit all SQL files without credentials, but production schema readiness needs linked remote migration history too.

## Current Blocker

`npm run supabase:migrations:linked` and `npm run security:api-readiness:report` cannot compare remote migration history until the Supabase CLI has an access token.

The current warning is expected when this is missing:

```text
Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.
```

## Local Setup

Use one of these options in a private terminal:

```bash
supabase login
```

or:

```bash
export SUPABASE_ACCESS_TOKEN=<your-supabase-access-token>
```

Do not commit the token to `.env.example`, docs, scripts, or source files.

## Verify

Run:

```bash
npm run supabase:migrations:linked
npm run security:api-readiness:report
```

Expected result after auth is configured:

- `docs/supabase-migration-drift-report.md` shows `SUPABASE_ACCESS_TOKEN configured: yes`.
- The Remote Query section says linked remote migration history was read successfully.
- `docs/api-readiness-report.md` no longer reports `migration-history-unavailable`.

## Production Rule

Do not run production schema push/pull until linked migration history has been read and reconciled. Local-only analysis is useful for file hygiene, but it cannot prove the remote database history is safe.
