alter table public.channels
  add column if not exists restrict_saving_content boolean not null default true;

comment on column public.channels.restrict_saving_content is
  'When true, channel media uses best-effort client-side controls to discourage saving/downloading by non-managers.';
