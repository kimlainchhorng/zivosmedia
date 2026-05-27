-- Auto Repair — Labor Time entries.
-- AutoRepairLaborTimeSection (live timer, time logs, KPIs by tech/vehicle)
-- queries and mutates ar_labor_entries, which never existed in the schema.
-- Every query was silently returning the PostgREST "table not found" error
-- inside a try/catch and the section showed an empty state forever.

create table if not exists public.ar_labor_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.restaurants(id) on delete cascade,
  tech_id uuid not null references public.ar_technicians(id) on delete cascade,
  work_order_id uuid references public.ar_work_orders(id) on delete set null,
  vehicle_id uuid references public.ar_customer_vehicles(id) on delete set null,
  labor_type text not null default 'Repair',
  duration_minutes integer not null default 0,
  is_billable boolean not null default true,
  rate_override_cents integer,   -- overrides ar_technicians.hourly_rate_cents when set
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ar_labor_entries_store_id_idx
  on public.ar_labor_entries (store_id);

create index if not exists ar_labor_entries_store_tech_idx
  on public.ar_labor_entries (store_id, tech_id);

create index if not exists ar_labor_entries_store_wo_idx
  on public.ar_labor_entries (store_id, work_order_id)
  where work_order_id is not null;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'ar_labor_entries_set_updated_at'
  ) then
    create trigger ar_labor_entries_set_updated_at
      before update on public.ar_labor_entries
      for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.ar_labor_entries enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ar_labor_entries'
      and policyname = 'merged_all_authenticated'
  ) then
    create policy "merged_all_authenticated"
      on public.ar_labor_entries for all
      using (
        has_role((select auth.uid()), 'admin')
        or exists (
          select 1 from public.restaurants r
          where r.id = ar_labor_entries.store_id
            and r.owner_id = (select auth.uid())
        )
      )
      with check (
        has_role((select auth.uid()), 'admin')
        or exists (
          select 1 from public.restaurants r
          where r.id = ar_labor_entries.store_id
            and r.owner_id = (select auth.uid())
        )
      );
  end if;
end $$;
