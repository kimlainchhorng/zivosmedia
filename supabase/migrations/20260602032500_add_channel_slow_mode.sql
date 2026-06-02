alter table public.channels
  add column if not exists slow_mode_seconds integer not null default 0;

alter table public.channels
  drop constraint if exists channels_slow_mode_seconds_check;

alter table public.channels
  add constraint channels_slow_mode_seconds_check
  check (slow_mode_seconds in (0, 5, 10, 30, 60, 300, 900, 3600));

comment on column public.channels.slow_mode_seconds is
  'Minimum delay between channel posts by the same author, in seconds.';
