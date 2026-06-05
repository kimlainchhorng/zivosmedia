-- Supabase migration reconciliation repair draft
-- Generated: 2026-06-05T12:57:08.308Z
--
-- Review-only artifact. Do not run this file as-is.
-- Every repair statement is commented out until local/remote SQL intent is manually verified.
-- Keep a backup of supabase_migrations.schema_migrations before any approved history repair.
--
-- Candidate mappings: 0
-- High confidence (<= 5 seconds apart): 0
-- Medium confidence (6-60 seconds apart): 0
--
-- Suggested manual review query before any repair:
-- select version, name, statements from supabase_migrations.schema_migrations order by version;
--
begin;

-- Verify after applying an approved subset:
-- select version from supabase_migrations.schema_migrations order by version;

rollback;
