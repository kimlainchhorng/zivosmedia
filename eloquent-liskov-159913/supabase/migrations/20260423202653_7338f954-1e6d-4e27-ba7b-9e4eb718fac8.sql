create table if not exists public.lodge_receipt_share_tokens (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.lodge_reservation_receipts(id) on delete cascade,
  reservation_id uuid not null references public.lodge_reservations(id) on delete cascade,
  guest_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_accessed_at timestamptz null,
  access_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.lodge_receipt_share_tokens enable row level security;

create index if not exists idx_lodge_receipt_share_tokens_receipt on public.lodge_receipt_share_tokens(receipt_id, expires_at desc);
create index if not exists idx_lodge_receipt_share_tokens_guest on public.lodge_receipt_share_tokens(guest_id, created_at desc);

create policy "Guests can view their own lodging receipt share links"
on public.lodge_receipt_share_tokens
for select
to authenticated
using (guest_id = auth.uid());

create policy "Admins can manage lodging receipt share links"
on public.lodge_receipt_share_tokens
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
