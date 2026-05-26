# Database Upgrade Readiness Report

Generated: 2026-05-26T19:21:55.193Z

## Summary

- Supabase CLI: 2.100.0
- Local migrations: 700
- Invalid migration filenames: 0
- Duplicate migration versions: 8
- Allowed legacy duplicate migration versions: 8
- New duplicate migration versions: 0
- Duplicate SQL hashes: 0
- Last linked drift report: local=700, remote=0, matched=0, remoteError=yes, generated=2026-05-26T19:21:51.461Z
- Declared extensions: citext, pg_cron, pg_net, pg_trgm, pgcrypto
- Postgres 17 unsupported extensions found: 0
- Public tables created in migrations: 768
- Public tables needing RLS review: 0
- Recent public tables needing Data API grant review: 0
- Views needing security_invoker review: 0
- SECURITY DEFINER files needing search_path review: 0

## Blockers

- Linked Supabase migration history could not be read. Run supabase login or configure authenticated MCP before upgrade.

## Warnings

- None

## Duplicate Versions

- 20260429230000: 20260429230000_security_hardening.sql, 20260429230000_user_posts_visibility_location.sql (allowed legacy duplicate)
- 20260429240000: 20260429240000_backfill_storage_paths.sql, 20260429240000_increment_user_post_views.sql (allowed legacy duplicate)
- 20260429250000: 20260429250000_post_actions_tables.sql, 20260429250000_user_posts_realtime.sql (allowed legacy duplicate)
- 20260429260000: 20260429260000_post_comments_realtime.sql, 20260429260000_post_reactions.sql (allowed legacy duplicate)
- 20260430020000: 20260430020000_blocked_link_attempts.sql, 20260430020000_fix_social_notification_triggers.sql (allowed legacy duplicate)
- 20260430040000: 20260430040000_ar_shop_settings_column.sql, 20260430040000_comment_pinning.sql (allowed legacy duplicate)
- 20260430050000: 20260430050000_booking_to_workorder_link.sql, 20260430050000_post_comments_pin_and_edit.sql (allowed legacy duplicate)
- 20260430060000: 20260430060000_ar_estimates_share_token.sql, 20260430060000_post_comments_notification_trigger.sql (allowed legacy duplicate)

## Postgres 17 Extension Review

- None

## RLS Review Candidates

- None

## Data API Grant Review Candidates

- None

## View Review Candidates

- None

## Remote SQL To Run Before Upgrade

```sql
select version();
select extname, extversion from pg_extension order by extname;
select version from supabase_migrations.schema_migrations order by version;
select table_schema, table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
order by table_schema, table_name, grantee, privilege_type;
select schemaname, tablename
from pg_tables t
join pg_class c on c.relname = t.tablename
join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
where schemaname = 'public' and not c.relrowsecurity
order by schemaname, tablename;
```

## Upgrade Path

1. Install/authenticate Supabase CLI or MCP and refresh `docs/supabase-migration-drift-report.md`.
2. Reconcile duplicate local migration versions without rewriting already-applied production history.
3. Compare remote schema history to local migrations and decide whether this repo needs a baseline migration.
4. Confirm no Postgres 17-unsupported extensions are installed remotely.
5. For every public table that must be reachable through REST/GraphQL, enable RLS and add explicit grants for `anon` and/or `authenticated`.
6. Run Supabase advisors, type generation, API readiness, secret scan, and a production build.
