-- Adds a per-store default display language to store_profiles.
-- Backs the "Store Language" selector in the store editor (AdminStoreEditPage)
-- and is whitelisted by the store-profile-manage edge function.
-- Nullable; null = inherit the app default. Idempotent.
--
-- Already applied to the linked project via the Supabase MCP apply_migration;
-- committed here so the repo migration history stays in sync with prod.
alter table public.store_profiles
  add column if not exists default_language text;

comment on column public.store_profiles.default_language is
  'Store''s default display language (locale code, e.g. en, km). Null = inherit app default.';
