-- Internal tables should not be directly reachable through the Data API.
--
-- ar_doc_counters is managed by the SECURITY DEFINER ar_next_doc_number RPC.
-- bot_updates and bot_user_state are managed by Supabase Edge Functions using
-- the service role key. Keep explicit deny policies as documentation and as a
-- guardrail if grants are accidentally broadened later.

revoke all on table public.ar_doc_counters from public;
revoke all on table public.ar_doc_counters from anon;
revoke all on table public.ar_doc_counters from authenticated;

revoke all on table public.bot_updates from public;
revoke all on table public.bot_updates from anon;
revoke all on table public.bot_updates from authenticated;

revoke all on table public.bot_user_state from public;
revoke all on table public.bot_user_state from anon;
revoke all on table public.bot_user_state from authenticated;

drop policy if exists "Deny direct client access to doc counters" on public.ar_doc_counters;
create policy "Deny direct client access to doc counters"
on public.ar_doc_counters
for all
to public
using (false)
with check (false);

drop policy if exists "Deny direct client access to bot updates" on public.bot_updates;
create policy "Deny direct client access to bot updates"
on public.bot_updates
for all
to public
using (false)
with check (false);

drop policy if exists "Deny direct client access to bot user state" on public.bot_user_state;
create policy "Deny direct client access to bot user state"
on public.bot_user_state
for all
to public
using (false)
with check (false);
