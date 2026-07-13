do $$ begin
  create type public.channel_wallpaper_style as enum ('green', 'blue', 'pink', 'none');
exception
  when duplicate_object then null;
end $$;

alter table public.channels
  add column if not exists wallpaper_style public.channel_wallpaper_style not null default 'green';

comment on column public.channels.wallpaper_style is
  'Telegram-style wallpaper preset used for the public channel view.';
