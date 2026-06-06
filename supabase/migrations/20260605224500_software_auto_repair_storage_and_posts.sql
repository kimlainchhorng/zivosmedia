-- ZIVO Software: storage buckets and post comments for auto-repair workspace.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('store-posts', 'store-posts', true, 104857600, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']),
  ('part-images', 'part-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('ar-job-photos', 'ar-job-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('ar-receipts', 'ar-receipts', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('ar-receipts-fallback', 'ar-receipts-fallback', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.store_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.store_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_store_post_comments_post
  on public.store_post_comments(post_id, created_at);

alter table public.store_post_comments enable row level security;

drop policy if exists "Software store owners manage store_post_comments" on public.store_post_comments;
create policy "Software store owners manage store_post_comments"
on public.store_post_comments
for all
to authenticated
using (exists (
  select 1 from public.store_posts p
  join public.store_profiles sp on sp.id = p.store_id
  where p.id = store_post_comments.post_id and sp.owner_id = auth.uid()
))
with check (exists (
  select 1 from public.store_posts p
  join public.store_profiles sp on sp.id = p.store_id
  where p.id = store_post_comments.post_id and sp.owner_id = auth.uid()
));

grant select, insert, update, delete on public.store_post_comments to authenticated;

drop policy if exists "Software owners read auto repair storage" on storage.objects;
create policy "Software owners read auto repair storage"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('store-assets','store-posts','part-images','ar-job-photos','ar-receipts','ar-receipts-fallback')
  and exists (
    select 1 from public.store_profiles sp
    where sp.owner_id = auth.uid()
      and ((storage.foldername(name))[1] = sp.id::text or (storage.foldername(name))[2] = sp.id::text)
  )
);

drop policy if exists "Software owners upload auto repair storage" on storage.objects;
create policy "Software owners upload auto repair storage"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('store-assets','store-posts','part-images','ar-job-photos','ar-receipts','ar-receipts-fallback')
  and exists (
    select 1 from public.store_profiles sp
    where sp.owner_id = auth.uid()
      and ((storage.foldername(name))[1] = sp.id::text or (storage.foldername(name))[2] = sp.id::text)
  )
);

drop policy if exists "Software owners update auto repair storage" on storage.objects;
create policy "Software owners update auto repair storage"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('store-assets','store-posts','part-images','ar-job-photos','ar-receipts','ar-receipts-fallback')
  and exists (
    select 1 from public.store_profiles sp
    where sp.owner_id = auth.uid()
      and ((storage.foldername(name))[1] = sp.id::text or (storage.foldername(name))[2] = sp.id::text)
  )
)
with check (
  bucket_id in ('store-assets','store-posts','part-images','ar-job-photos','ar-receipts','ar-receipts-fallback')
  and exists (
    select 1 from public.store_profiles sp
    where sp.owner_id = auth.uid()
      and ((storage.foldername(name))[1] = sp.id::text or (storage.foldername(name))[2] = sp.id::text)
  )
);

drop policy if exists "Software owners delete auto repair storage" on storage.objects;
create policy "Software owners delete auto repair storage"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('store-assets','store-posts','part-images','ar-job-photos','ar-receipts','ar-receipts-fallback')
  and exists (
    select 1 from public.store_profiles sp
    where sp.owner_id = auth.uid()
      and ((storage.foldername(name))[1] = sp.id::text or (storage.foldername(name))[2] = sp.id::text)
  )
);
