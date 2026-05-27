-- Exposed-schema wrapper for the service-role Edge Function.
--
-- Supabase PostgREST only exposes configured schemas (currently api/public).
-- The atomic implementation stays in private.unlock_group_locked_media; this
-- wrapper is executable by service_role only, so browser clients still cannot
-- create completed unlocks or call the transfer RPC directly.

create schema if not exists api;

create or replace function api.unlock_group_locked_media(
  p_actor_id uuid,
  p_message_id uuid
)
returns jsonb
language sql
security definer
set search_path = public, private
as $$
  select private.unlock_group_locked_media(p_actor_id, p_message_id);
$$;

revoke all on function api.unlock_group_locked_media(uuid, uuid) from public, anon, authenticated;
grant usage on schema api to service_role;
grant execute on function api.unlock_group_locked_media(uuid, uuid) to service_role;
