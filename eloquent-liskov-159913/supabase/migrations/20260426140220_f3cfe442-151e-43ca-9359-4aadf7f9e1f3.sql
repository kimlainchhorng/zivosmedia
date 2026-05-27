
create extension if not exists citext;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin','moderator','user');
  end if;
end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_roles' and policyname='Users can view own roles') then
    create policy "Users can view own roles" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
  end if;
end $$;

create table if not exists public.usernames (
  username citext primary key,
  user_id uuid,
  reserved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]{4,32}$'),
  constraint reserved_or_owned check ((reserved = true and user_id is null) or (reserved = false and user_id is not null))
);
create unique index if not exists usernames_user_id_unique on public.usernames(user_id) where user_id is not null;
alter table public.usernames enable row level security;

do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='username') then
    alter table public.profiles add column username citext unique;
  end if;
end $$;

create or replace function public.sync_username_to_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op in ('INSERT','UPDATE')) and new.user_id is not null then
    update public.profiles set username = new.username where user_id = new.user_id;
  elsif (tg_op = 'DELETE') and old.user_id is not null then
    update public.profiles set username = null where user_id = old.user_id;
  end if;
  return null;
end $$;

drop trigger if exists trg_sync_username on public.usernames;
create trigger trg_sync_username after insert or update or delete on public.usernames
for each row execute function public.sync_username_to_profile();

do $$ begin
  if not exists (select 1 from pg_policies where tablename='usernames' and policyname='Authenticated can read usernames') then
    create policy "Authenticated can read usernames" on public.usernames for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='usernames' and policyname='Users claim own username') then
    create policy "Users claim own username" on public.usernames for insert to authenticated with check (auth.uid() = user_id and reserved = false);
  end if;
  if not exists (select 1 from pg_policies where tablename='usernames' and policyname='Users update own username') then
    create policy "Users update own username" on public.usernames for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id and reserved = false);
  end if;
  if not exists (select 1 from pg_policies where tablename='usernames' and policyname='Users delete own username') then
    create policy "Users delete own username" on public.usernames for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

insert into public.usernames (username, user_id, reserved)
select v, null, true from (values
  ('admin'),('support'),('zivo'),('hizivo'),('official'),('staff'),('help'),
  ('system'),('root'),('moderator'),('team'),('security'),('billing'),
  ('payments'),('login'),('signup'),('settings'),('null'),('saved'),
  ('telegram'),('whatsapp'),('messenger'),('contact'),('contacts'),
  ('channel'),('group'),('chat')
) as t(v)
on conflict (username) do nothing;

create table if not exists public.user_contacts (
  owner_id uuid not null,
  contact_user_id uuid not null,
  custom_name text,
  favorite boolean not null default false,
  added_via text not null default 'username' check (added_via in ('username','qr','invite_link','phone','suggestion','group')),
  created_at timestamptz not null default now(),
  primary key (owner_id, contact_user_id),
  check (owner_id <> contact_user_id)
);
alter table public.user_contacts enable row level security;
create index if not exists idx_user_contacts_owner on public.user_contacts(owner_id);
create index if not exists idx_user_contacts_contact on public.user_contacts(contact_user_id);

do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_contacts' and policyname='Owner reads contacts') then
    create policy "Owner reads contacts" on public.user_contacts for select to authenticated using (auth.uid() = owner_id or public.has_role(auth.uid(),'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename='user_contacts' and policyname='Owner adds contacts') then
    create policy "Owner adds contacts" on public.user_contacts for insert to authenticated with check (auth.uid() = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='user_contacts' and policyname='Owner updates contacts') then
    create policy "Owner updates contacts" on public.user_contacts for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='user_contacts' and policyname='Owner removes contacts') then
    create policy "Owner removes contacts" on public.user_contacts for delete to authenticated using (auth.uid() = owner_id);
  end if;
end $$;

-- Existing user_blocks table: ensure RLS + owner-scoped policies (column is blocker_user_id)
alter table public.user_blocks enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_blocks' and policyname='Owner reads blocks') then
    create policy "Owner reads blocks" on public.user_blocks for select to authenticated using (auth.uid() = blocker_user_id or public.has_role(auth.uid(),'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename='user_blocks' and policyname='Owner adds blocks') then
    create policy "Owner adds blocks" on public.user_blocks for insert to authenticated with check (auth.uid() = blocker_user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='user_blocks' and policyname='Owner removes blocks') then
    create policy "Owner removes blocks" on public.user_blocks for delete to authenticated using (auth.uid() = blocker_user_id);
  end if;
end $$;

create table if not exists public.user_privacy_settings (
  user_id uuid primary key,
  last_seen text not null default 'contacts' check (last_seen in ('everyone','contacts','nobody')),
  profile_photo text not null default 'everyone' check (profile_photo in ('everyone','contacts','nobody')),
  bio_visibility text not null default 'everyone' check (bio_visibility in ('everyone','contacts','nobody')),
  phone_visibility text not null default 'nobody' check (phone_visibility in ('everyone','contacts','nobody')),
  forwards text not null default 'everyone' check (forwards in ('everyone','contacts','nobody')),
  calls text not null default 'contacts' check (calls in ('everyone','contacts','nobody')),
  group_invites text not null default 'contacts' check (group_invites in ('everyone','contacts','nobody')),
  read_receipts boolean not null default true,
  exceptions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.user_privacy_settings enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='user_privacy_settings' and policyname='Owner reads privacy') then
    create policy "Owner reads privacy" on public.user_privacy_settings for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
  end if;
  if not exists (select 1 from pg_policies where tablename='user_privacy_settings' and policyname='Owner upserts privacy') then
    create policy "Owner upserts privacy" on public.user_privacy_settings for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename='user_privacy_settings' and policyname='Owner updates privacy') then
    create policy "Owner updates privacy" on public.user_privacy_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists public.qr_login_tokens (
  token text primary key,
  user_id uuid,
  created_by_device text,
  created_at timestamptz not null default now(),
  consumed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '2 minutes')
);
alter table public.qr_login_tokens enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='qr_login_tokens' and policyname='Authed reads own consumed token') then
    create policy "Authed reads own consumed token" on public.qr_login_tokens for select to authenticated using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_privacy_touch on public.user_privacy_settings;
create trigger trg_privacy_touch before update on public.user_privacy_settings
for each row execute function public.touch_updated_at();
