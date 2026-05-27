-- Admin safety review inbox access.
-- Existing queue policies let reporters read their own reports. This adds the
-- admin-side access needed for /admin/moderation without broadening user access.

create index if not exists idx_content_moderation_queue_review
  on public.content_moderation_queue (status, severity, created_at desc);

create index if not exists idx_content_moderation_queue_type_created
  on public.content_moderation_queue (content_type, created_at desc);

grant select, update on table public.content_moderation_queue to authenticated;
grant select, insert on table public.moderation_actions to authenticated;

drop policy if exists "Admins can read moderation queue" on public.content_moderation_queue;
create policy "Admins can read moderation queue"
  on public.content_moderation_queue
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can update moderation queue" on public.content_moderation_queue;
create policy "Admins can update moderation queue"
  on public.content_moderation_queue
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can read moderation actions" on public.moderation_actions;
create policy "Admins can read moderation actions"
  on public.moderation_actions
  for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can insert moderation actions" on public.moderation_actions;
create policy "Admins can insert moderation actions"
  on public.moderation_actions
  for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    and moderator_id = auth.uid()
  );
