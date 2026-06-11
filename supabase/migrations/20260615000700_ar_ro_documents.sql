-- RO print archive.
--
-- Every printed/exported repair order is stored as a branded PDF in the private
-- `ro-documents` bucket and logged in `ar_ro_documents`, so owners can re-open
-- or re-print past ROs. Writes go through the `ar-ro-archive` Edge Function
-- (service role); owners can read their own rows directly via RLS.

create table if not exists public.ar_ro_documents (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_profiles(id) on delete cascade,
  ro_number text,
  doc_type text not null default 'repair_order',
  customer_name text,
  vehicle_label text,
  total_cents bigint not null default 0,
  bucket text not null default 'ro-documents',
  path text not null,
  printed_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_ar_ro_documents_store_created
  on public.ar_ro_documents (store_id, created_at desc);

alter table public.ar_ro_documents enable row level security;

-- Mirrors the AR convention: store owners manage their own store's rows.
drop policy if exists "Store owners manage ar_ro_documents" on public.ar_ro_documents;
create policy "Store owners manage ar_ro_documents"
on public.ar_ro_documents
for all
to authenticated
using (exists (
  select 1 from public.store_profiles sp
  where sp.id = ar_ro_documents.store_id and sp.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.store_profiles sp
  where sp.id = ar_ro_documents.store_id and sp.owner_id = auth.uid()
));

grant select, insert, update, delete on public.ar_ro_documents to authenticated;

-- Private bucket for archived RO PDFs. The Edge Function uploads with the
-- service role and hands back short-lived signed URLs, so no public/anon
-- object policies are needed.
insert into storage.buckets (id, name, public)
values ('ro-documents', 'ro-documents', false)
on conflict (id) do nothing;
