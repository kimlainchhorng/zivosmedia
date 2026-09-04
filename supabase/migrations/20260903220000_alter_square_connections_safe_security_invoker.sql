-- Align the repo with the live hardening of square_connections_safe.
--
-- The live database already runs this view with security_invoker = true
-- (hand-applied outside migration bookkeeping, like most of this project's
-- early history). Expressing it here is what the database-upgrade-readiness
-- scanner keys on when it counts views needing Postgres 17 / Data API
-- exposure review. Re-applying is a no-op on the live schema.
alter view if exists public.square_connections_safe
  set (security_invoker = true);
