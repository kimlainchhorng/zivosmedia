-- Notifications: let each signed-in user manage their OWN in-app notifications
-- directly (delete / mark-read / clear).
--
-- Background: 20260601100000_notifications_server_gate.sql added RESTRICTIVE
-- block policies routing every update/delete through the notification-manage
-- edge function. That function could never be deployed (the project hit its
-- Edge Function cap), so the block was never applied to production and the
-- in-app bell's delete / mark-read silently failed.
--
-- Per-user RLS gives the same ownership guarantee without that dependency:
-- a user can only touch rows where user_id = auth.uid().

alter table public.notifications enable row level security;

-- Remove the unused server-gate block (no-op where it was never applied).
drop policy if exists notifications_block_direct_update on public.notifications;
drop policy if exists notifications_block_direct_delete on public.notifications;

-- Re-assert per-user ownership for update + delete (idempotent).
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications"
  on public.notifications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

comment on policy "Users delete own notifications" on public.notifications is
  'Owner-scoped delete: a signed-in user may delete only their own notifications (auth.uid() = user_id).';
comment on policy "Users update own notifications" on public.notifications is
  'Owner-scoped update: a signed-in user may mark-read / snooze only their own notifications (auth.uid() = user_id).';
