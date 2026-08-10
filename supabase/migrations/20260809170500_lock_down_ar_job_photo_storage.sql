-- Remove the legacy bucket-only policies for auto-repair photos. Supabase RLS
-- policies are additive, so the later folder policy did not constrain these
-- earlier grants. The first path segment must be the owned restaurant id.

begin;

drop policy if exists "ar_job_photos_authenticated_write" on storage.objects;
drop policy if exists "ar_job_photos_authenticated_delete" on storage.objects;
drop policy if exists "Software owners upload auto repair storage" on storage.objects;
drop policy if exists "Software owners update auto repair storage" on storage.objects;
drop policy if exists "Software owners delete auto repair storage" on storage.objects;

-- Preserve the shared owner policies for the other software buckets, but keep
-- ar-job-photos behind the restaurant-owner policies below.
create policy "Software owners upload auto repair storage"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('store-assets', 'store-posts', 'part-images', 'ar-receipts', 'ar-receipts-fallback')
  and exists (
    select 1 from public.store_profiles sp
    where sp.owner_id = (select auth.uid())
      and ((storage.foldername(name))[1] = sp.id::text or (storage.foldername(name))[2] = sp.id::text)
  )
);

create policy "Software owners update auto repair storage"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('store-assets', 'store-posts', 'part-images', 'ar-receipts', 'ar-receipts-fallback')
  and exists (
    select 1 from public.store_profiles sp
    where sp.owner_id = (select auth.uid())
      and ((storage.foldername(name))[1] = sp.id::text or (storage.foldername(name))[2] = sp.id::text)
  )
)
with check (
  bucket_id in ('store-assets', 'store-posts', 'part-images', 'ar-receipts', 'ar-receipts-fallback')
  and exists (
    select 1 from public.store_profiles sp
    where sp.owner_id = (select auth.uid())
      and ((storage.foldername(name))[1] = sp.id::text or (storage.foldername(name))[2] = sp.id::text)
  )
);

create policy "Software owners delete auto repair storage"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('store-assets', 'store-posts', 'part-images', 'ar-receipts', 'ar-receipts-fallback')
  and exists (
    select 1 from public.store_profiles sp
    where sp.owner_id = (select auth.uid())
      and ((storage.foldername(name))[1] = sp.id::text or (storage.foldername(name))[2] = sp.id::text)
  )
);

create policy "ar_job_photos_owner_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ar-job-photos'
  and (
    public.has_role((select auth.uid()), 'admin')
    or exists (
      select 1
      from public.restaurants restaurant
      where restaurant.id = case
        when (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
          then (storage.foldername(name))[1]::uuid
        else null
      end
        and restaurant.owner_id = (select auth.uid())
    )
  )
);

create policy "ar_job_photos_owner_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ar-job-photos'
  and (
    public.has_role((select auth.uid()), 'admin')
    or exists (
      select 1
      from public.restaurants restaurant
      where restaurant.id = case
        when (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
          then (storage.foldername(name))[1]::uuid
        else null
      end
        and restaurant.owner_id = (select auth.uid())
    )
  )
)
with check (
  bucket_id = 'ar-job-photos'
  and (
    public.has_role((select auth.uid()), 'admin')
    or exists (
      select 1
      from public.restaurants restaurant
      where restaurant.id = case
        when (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
          then (storage.foldername(name))[1]::uuid
        else null
      end
        and restaurant.owner_id = (select auth.uid())
    )
  )
);

create policy "ar_job_photos_owner_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ar-job-photos'
  and (
    public.has_role((select auth.uid()), 'admin')
    or exists (
      select 1
      from public.restaurants restaurant
      where restaurant.id = case
        when (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
          then (storage.foldername(name))[1]::uuid
        else null
      end
        and restaurant.owner_id = (select auth.uid())
    )
  )
);

commit;
