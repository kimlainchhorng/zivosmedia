
-- ===== two_step_auth =====
create table if not exists public.two_step_auth (
  user_id uuid primary key,
  password_hash text not null,
  password_salt text not null,
  hint text,
  recovery_email text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.two_step_auth enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='two_step_auth' and policyname='Owner reads two-step') then
    create policy "Owner reads two-step" on public.two_step_auth for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='two_step_auth' and policyname='Owner inserts two-step') then
    create policy "Owner inserts two-step" on public.two_step_auth for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='two_step_auth' and policyname='Owner updates two-step') then
    create policy "Owner updates two-step" on public.two_step_auth for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='two_step_auth' and policyname='Owner deletes two-step') then
    create policy "Owner deletes two-step" on public.two_step_auth for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ===== user_passcode =====
create table if not exists public.user_passcode (
  user_id uuid primary key,
  passcode_hash text not null,
  passcode_salt text not null,
  biometric_enabled boolean not null default false,
  auto_lock_minutes integer not null default 5,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_passcode enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_passcode' and policyname='Owner reads passcode') then
    create policy "Owner reads passcode" on public.user_passcode for select to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_passcode' and policyname='Owner inserts passcode') then
    create policy "Owner inserts passcode" on public.user_passcode for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_passcode' and policyname='Owner updates passcode') then
    create policy "Owner updates passcode" on public.user_passcode for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_passcode' and policyname='Owner deletes passcode') then
    create policy "Owner deletes passcode" on public.user_passcode for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- ===== login_alerts =====
create table if not exists public.login_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event text not null check (event in ('login','logout','session_revoked','two_step_changed','password_changed','suspicious')),
  device_name text,
  platform text,
  ip text,
  country text,
  city text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_login_alerts_user_created on public.login_alerts(user_id, created_at desc);
alter table public.login_alerts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='login_alerts' and policyname='Owner reads alerts') then
    create policy "Owner reads alerts" on public.login_alerts for select to authenticated
      using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='login_alerts' and policyname='Owner inserts alerts') then
    create policy "Owner inserts alerts" on public.login_alerts for insert to authenticated with check (auth.uid() = user_id);
  end if;
end $$;

-- ===== updated_at triggers =====
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_two_step_touch on public.two_step_auth;
create trigger trg_two_step_touch before update on public.two_step_auth
for each row execute function public.touch_updated_at();

drop trigger if exists trg_passcode_touch on public.user_passcode;
create trigger trg_passcode_touch before update on public.user_passcode
for each row execute function public.touch_updated_at();
