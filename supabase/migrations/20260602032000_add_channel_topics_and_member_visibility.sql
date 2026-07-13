alter table public.channels
  add column if not exists topics_enabled boolean not null default false,
  add column if not exists hide_members boolean not null default false;

comment on column public.channels.topics_enabled is
  'Whether the channel uses Telegram-style discussion topics.';

comment on column public.channels.hide_members is
  'Whether non-admin subscribers should be prevented from viewing the member list.';
