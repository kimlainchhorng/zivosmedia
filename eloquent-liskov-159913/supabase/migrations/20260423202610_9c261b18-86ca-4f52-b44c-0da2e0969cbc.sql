create table if not exists public.lodge_refund_disputes (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.lodge_reservations(id) on delete cascade,
  store_id uuid not null,
  guest_id uuid not null,
  change_request_id uuid null references public.lodge_reservation_change_requests(id) on delete set null,
  reason_category text not null default 'refund_review',
  description text not null,
  requested_amount_cents integer not null default 0,
  status text not null default 'pending',
  admin_response text null,
  resolution_amount_cents integer null,
  resolved_by uuid null,
  resolved_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lodge_refund_disputes enable row level security;

create index if not exists idx_lodge_refund_disputes_reservation on public.lodge_refund_disputes(reservation_id, created_at desc);
create index if not exists idx_lodge_refund_disputes_store on public.lodge_refund_disputes(store_id, status, created_at desc);
create unique index if not exists idx_lodge_refund_disputes_one_open_per_reservation
on public.lodge_refund_disputes(reservation_id)
where status in ('pending', 'under_review', 'approved');

create policy "Guests can view their lodging refund disputes"
on public.lodge_refund_disputes
for select
to authenticated
using (guest_id = auth.uid());

create policy "Guests can create lodging refund disputes"
on public.lodge_refund_disputes
for insert
to authenticated
with check (guest_id = auth.uid());

create policy "Store owners can view lodging refund disputes"
on public.lodge_refund_disputes
for select
to authenticated
using (exists (
  select 1 from public.restaurants r
  where r.id = lodge_refund_disputes.store_id
    and r.owner_id = auth.uid()
));

create policy "Admins can manage lodging refund disputes"
on public.lodge_refund_disputes
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create trigger update_lodge_refund_disputes_updated_at
before update on public.lodge_refund_disputes
for each row
execute function public.update_updated_at_column();

alter publication supabase_realtime add table public.lodge_refund_disputes;