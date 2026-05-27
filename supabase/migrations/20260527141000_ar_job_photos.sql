-- Auto Repair — Job Photos.
-- AutoRepairPhotosSection has been writing to ar_job_photos and uploading
-- to the ar-job-photos storage bucket, neither of which existed. The whole
-- photos feature was silently failing. This migration creates both.

create table if not exists public.ar_job_photos (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.restaurants(id) on delete cascade,
  work_order_id uuid references public.ar_work_orders(id) on delete set null,
  photo_url text not null,
  photo_type text not null default 'before',   -- before | after | in-progress
  caption text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ar_job_photos_store_id_idx
  on public.ar_job_photos (store_id);

create index if not exists ar_job_photos_store_wo_idx
  on public.ar_job_photos (store_id, work_order_id);

alter table public.ar_job_photos enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ar_job_photos'
      and policyname = 'merged_all_authenticated'
  ) then
    create policy "merged_all_authenticated"
      on public.ar_job_photos for all
      using (
        has_role((select auth.uid()), 'admin')
        or exists (
          select 1 from public.restaurants r
          where r.id = ar_job_photos.store_id
            and r.owner_id = (select auth.uid())
        )
      )
      with check (
        has_role((select auth.uid()), 'admin')
        or exists (
          select 1 from public.restaurants r
          where r.id = ar_job_photos.store_id
            and r.owner_id = (select auth.uid())
        )
      );
  end if;
end $$;

-- Storage bucket. Public reads so the photo_url renders for customers / sharing;
-- writes restricted to authenticated users (admin or store owner check is done
-- via the table policy on insert, and via folder convention at upload).
insert into storage.buckets (id, name, public)
values ('ar-job-photos', 'ar-job-photos', true)
on conflict (id) do update set public = excluded.public;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'ar_job_photos_authenticated_write'
  ) then
    create policy "ar_job_photos_authenticated_write"
      on storage.objects for insert
      to authenticated
      with check (bucket_id = 'ar-job-photos');
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'ar_job_photos_authenticated_delete'
  ) then
    create policy "ar_job_photos_authenticated_delete"
      on storage.objects for delete
      to authenticated
      using (bucket_id = 'ar-job-photos');
  end if;
end $$;
