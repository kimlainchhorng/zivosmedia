-- Create the `part-images` storage bucket used by the Auto-Repair Parts catalog.
--
-- AutoRepairPartShopSection uploads part images to storage.from("part-images")
-- with { upsert: true } and reads them via getPublicUrl, but the bucket was never
-- created — so adding/editing a part with an image failed silently. This mirrors
-- the working `ar-job-photos` bucket setup (public bucket + authenticated
-- write/update/delete), adding UPDATE to support upsert.

insert into storage.buckets (id, name, public)
values ('part-images', 'part-images', true)
on conflict (id) do nothing;

drop policy if exists "part_images_authenticated_write" on storage.objects;
create policy "part_images_authenticated_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'part-images');

drop policy if exists "part_images_authenticated_update" on storage.objects;
create policy "part_images_authenticated_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'part-images')
  with check (bucket_id = 'part-images');

drop policy if exists "part_images_authenticated_delete" on storage.objects;
create policy "part_images_authenticated_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'part-images');
