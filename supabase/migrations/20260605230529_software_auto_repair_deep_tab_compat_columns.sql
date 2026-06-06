alter table public.ar_technicians
  add column if not exists certifications text[] not null default '{}',
  add column if not exists specialties text[] not null default '{}';

alter table public.ar_bays
  add column if not exists lift_type text;

alter table public.ar_tires
  add column if not exists load_index text,
  add column if not exists speed_rating text,
  add column if not exists season text not null default 'all-season',
  add column if not exists dot text,
  add column if not exists retail_cents integer not null default 0,
  add column if not exists reorder_point integer not null default 4;

update public.ar_tires
set retail_cents = coalesce(nullif(retail_cents, 0), price_cents)
where retail_cents = 0 and price_cents is not null;

alter table public.ar_loaner_vehicles
  add column if not exists make text,
  add column if not exists model text,
  add column if not exists year integer,
  add column if not exists color text,
  add column if not exists current_customer_name text,
  add column if not exists due_back_date date,
  add column if not exists mileage_out integer,
  add column if not exists mileage_in integer,
  add column if not exists return_notes text,
  add column if not exists last_customer_name text;

alter table public.ar_loaner_vehicles alter column name drop not null;

update public.ar_loaner_vehicles
set name = trim(coalesce(year::text || ' ', '') || coalesce(make || ' ', '') || coalesce(model, ''))
where (name is null or name = '') and (make is not null or model is not null);

alter table public.ar_inspections
  add column if not exists technician_name text,
  add column if not exists summary text,
  add column if not exists share_token text,
  add column if not exists sent_at timestamptz;

create unique index if not exists idx_ar_inspections_share_token_unique
  on public.ar_inspections(share_token)
  where share_token is not null;

alter table public.ar_service_reminders
  add column if not exists reminder_type text,
  add column if not exists channel text not null default 'email',
  add column if not exists message text,
  add column if not exists due_at timestamptz,
  add column if not exists due_mileage integer,
  add column if not exists customer_email text,
  add column if not exists sent_at timestamptz;

update public.ar_service_reminders
set due_at = coalesce(due_at, due_date::timestamptz)
where due_at is null and due_date is not null;

alter table public.ar_recall_checks
  add column if not exists fetched_at timestamptz not null default now(),
  add column if not exists campaign_id text,
  add column if not exists summary text,
  add column if not exists severity text,
  add column if not exists make text,
  add column if not exists model text,
  add column if not exists year text;

alter table public.ar_warranties
  add column if not exists workorder_id uuid references public.ar_work_orders(id) on delete set null,
  add column if not exists service_name text,
  add column if not exists period_days integer,
  add column if not exists mileage_limit integer,
  add column if not exists network_id text,
  add column if not exists claim_number text;

update public.ar_warranties
set workorder_id = coalesce(workorder_id, work_order_id)
where workorder_id is null and work_order_id is not null;

alter table public.ar_expenses
  add column if not exists subtotal_cents integer not null default 0,
  add column if not exists tax_cents integer not null default 0,
  add column if not exists invoice_time time,
  add column if not exists invoice_number text,
  add column if not exists payment_method text,
  add column if not exists notes text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

update public.ar_expenses
set subtotal_cents = amount_cents
where subtotal_cents = 0 and amount_cents > 0;

alter table public.ar_expense_items
  add column if not exists part_number text,
  add column if not exists name text,
  add column if not exists quantity numeric(10,2) not null default 1,
  add column if not exists unit_price_cents integer not null default 0,
  add column if not exists line_total_cents integer not null default 0;

create or replace function public.set_ar_expense_item_store_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.store_id is null then
    select e.store_id into new.store_id
    from public.ar_expenses e
    where e.id = new.expense_id;
  end if;

  if new.amount_cents = 0 and new.line_total_cents > 0 then
    new.amount_cents := new.line_total_cents;
  end if;

  if new.line_total_cents = 0 then
    new.line_total_cents := coalesce(new.unit_price_cents, 0) * greatest(coalesce(new.quantity, 1), 0);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_ar_expense_item_store_id on public.ar_expense_items;
create trigger trg_set_ar_expense_item_store_id
before insert or update on public.ar_expense_items
for each row execute function public.set_ar_expense_item_store_id();

update public.ar_expense_items i
set store_id = e.store_id
from public.ar_expenses e
where i.expense_id = e.id and i.store_id is null;

alter table public.ar_job_photos alter column url drop not null;

update public.ar_job_photos
set url = coalesce(url, photo_url)
where url is null and photo_url is not null;

create index if not exists idx_ar_service_reminders_due_at
  on public.ar_service_reminders(store_id, due_at)
  where due_at is not null;

create index if not exists idx_ar_recall_checks_fetched_at
  on public.ar_recall_checks(store_id, fetched_at desc);

create index if not exists idx_ar_warranties_network
  on public.ar_warranties(store_id, network_id)
  where network_id is not null;

create index if not exists idx_ar_tires_reorder
  on public.ar_tires(store_id, qty, reorder_point)
  where active = true;
