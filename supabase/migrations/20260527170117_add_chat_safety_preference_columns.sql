-- Compatibility safety columns used by the chat client.
--
-- A broader sensitive media migration introduced these fields, but production
-- can drift when older prerequisite migrations were skipped. Keep this narrow
-- and idempotent so chat rendering and paid bundle verification do not depend
-- on unrelated moderation objects being present.

alter table public.privacy_settings
  add column if not exists blur_sensitive_media boolean not null default true;

alter table public.direct_messages
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists hidden_reason text,
  add column if not exists sensitive_report_count integer not null default 0;

alter table public.group_messages
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists hidden_reason text,
  add column if not exists sensitive_report_count integer not null default 0;

create index if not exists idx_direct_messages_visible_pair_created
  on public.direct_messages (
    least(sender_id, receiver_id),
    greatest(sender_id, receiver_id),
    created_at desc
  )
  where hidden_at is null;

create index if not exists idx_group_messages_visible_group_created
  on public.group_messages (group_id, created_at desc)
  where hidden_at is null;
