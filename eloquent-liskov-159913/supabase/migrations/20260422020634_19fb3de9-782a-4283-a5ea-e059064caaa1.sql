create table if not exists public.marketing_automation_tick_log (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  duration_ms int not null default 0,
  ok boolean not null default true,
  automations_processed int not null default 0,
  enrollments_created int not null default 0,
  steps_advanced int not null default 0,
  completed int not null default 0,
  error_message text
);
create index if not exists idx_mktg_tick_log_ran_at on public.marketing_automation_tick_log (ran_at desc);

alter table public.marketing_automation_tick_log enable row level security;

create policy "Admins read tick log"
on public.marketing_automation_tick_log for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create table if not exists public.store_notification_channels (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  channel text not null check (channel in ('push','email','sms','inapp')),
  status text not null default 'pending' check (status in ('pending','active','disabled','failed')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, channel)
);
create index if not exists idx_snc_store on public.store_notification_channels (store_id);

alter table public.store_notification_channels enable row level security;

create policy "Admins manage all store channels"
on public.store_notification_channels for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Store owners read their channels"
on public.store_notification_channels for select
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = store_notification_channels.store_id
      and r.owner_id = auth.uid()
  )
);

create policy "Store owners insert their channels"
on public.store_notification_channels for insert
to authenticated
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = store_notification_channels.store_id
      and r.owner_id = auth.uid()
  )
);

create policy "Store owners update their channels"
on public.store_notification_channels for update
to authenticated
using (
  exists (
    select 1 from public.restaurants r
    where r.id = store_notification_channels.store_id
      and r.owner_id = auth.uid()
  )
);

create or replace function public.touch_store_notification_channels()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_snc on public.store_notification_channels;
create trigger trg_touch_snc
before update on public.store_notification_channels
for each row execute function public.touch_store_notification_channels();

alter table public.marketing_promo_redemptions
  add column if not exists idempotency_key text;

create unique index if not exists ux_promo_redemptions_idem
  on public.marketing_promo_redemptions (idempotency_key)
  where idempotency_key is not null;