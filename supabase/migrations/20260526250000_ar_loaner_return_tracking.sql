-- Auto Repair — Loaner Vehicles table + return / check-in tracking.
--
-- The AutoRepairLoanersSection UI has been writing to ar_loaner_vehicles via
-- the typed-any escape hatch, but the table was never actually created in any
-- prior migration. Every query was silently failing. This migration creates
-- the table with the full schema the UI needs (vehicle info + checkout state +
-- return / check-in fields) and the RLS pattern used by other ar_* tables.

create table if not exists public.ar_loaner_vehicles (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.restaurants(id) on delete cascade,
  -- Vehicle info
  make text not null,
  model text not null,
  year integer,
  plate text,
  color text,
  -- Current state
  status text not null default 'available',  -- available | out | maintenance
  -- Active checkout (cleared on return)
  current_customer_name text,
  due_back_date date,
  mileage_out integer,
  -- Last return (preserved across checkouts so the shop can see history)
  mileage_in integer,
  return_notes text,
  returned_at timestamptz,
  last_customer_name text,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill columns if the table already existed without them (defensive).
alter table public.ar_loaner_vehicles
  add column if not exists mileage_in integer,
  add column if not exists return_notes text,
  add column if not exists returned_at timestamptz,
  add column if not exists last_customer_name text;

create index if not exists ar_loaner_vehicles_store_id_idx
  on public.ar_loaner_vehicles (store_id);

create index if not exists ar_loaner_vehicles_status_idx
  on public.ar_loaner_vehicles (store_id, status);

-- updated_at trigger (matches the project convention used by other ar_* tables).
do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'ar_loaner_vehicles_set_updated_at'
  ) then
    create trigger ar_loaner_vehicles_set_updated_at
      before update on public.ar_loaner_vehicles
      for each row execute function public.set_updated_at();
  end if;
exception when undefined_function then
  -- set_updated_at() helper not present; rely on app-side timestamping.
  null;
end $$;

alter table public.ar_loaner_vehicles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ar_loaner_vehicles'
      and policyname = 'merged_all_authenticated'
  ) then
    create policy "merged_all_authenticated"
      on public.ar_loaner_vehicles for all
      using (
        has_role((select auth.uid()), 'admin')
        or exists (
          select 1 from public.restaurants r
          where r.id = ar_loaner_vehicles.store_id
            and r.owner_id = (select auth.uid())
        )
      )
      with check (
        has_role((select auth.uid()), 'admin')
        or exists (
          select 1 from public.restaurants r
          where r.id = ar_loaner_vehicles.store_id
            and r.owner_id = (select auth.uid())
        )
      );
  end if;
end $$;
