create table if not exists public.app_private_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_private_settings enable row level security;
-- No policies = no access for any client role. Only service_role bypasses RLS.

create or replace function public.get_cron_secret()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select value from public.app_private_settings where key = 'cron_secret' limit 1;
$$;

revoke all on function public.get_cron_secret() from public, authenticated, anon;
grant execute on function public.get_cron_secret() to postgres;