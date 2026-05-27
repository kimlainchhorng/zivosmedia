-- Avoid Storage-wide upload failures caused by the zivo-service-photos
-- policies selecting service_orders directly. service_orders currently has an
-- RLS dependency path through service_offers that can recurse when invoked from
-- a storage.objects policy.

create schema if not exists private;

create or replace function private.uuid_from_first_path_segment(p_path text)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_segment text;
begin
  v_segment := split_part(coalesce(p_path, ''), '/', 1);
  if v_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return v_segment::uuid;
exception
  when others then
    return null;
end;
$$;

create or replace function private.can_insert_zivo_service_photo(
  p_path text,
  p_owner uuid,
  p_actor uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select
    p_actor is not null
    and p_owner = p_actor
    and exists (
      select 1
      from public.service_orders so
      join public.drivers d on d.id = so.driver_id
      where so.id = private.uuid_from_first_path_segment(p_path)
        and d.user_id = p_actor
    );
$$;

create or replace function private.can_read_zivo_service_photo(
  p_path text,
  p_actor uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select
    p_actor is not null
    and exists (
      select 1
      from public.service_orders so
      where so.id = private.uuid_from_first_path_segment(p_path)
        and (
          so.customer_id = p_actor
          or so.driver_id in (
            select d.id
            from public.drivers d
            where d.user_id = p_actor
          )
          or so.shop_id in (
            select r.id
            from public.restaurants r
            where r.owner_id = p_actor
          )
        )
    );
$$;

revoke all on function private.uuid_from_first_path_segment(text) from public, anon, authenticated;
revoke all on function private.can_insert_zivo_service_photo(text, uuid, uuid) from public, anon, authenticated;
revoke all on function private.can_read_zivo_service_photo(text, uuid) from public, anon, authenticated;

grant usage on schema private to authenticated;
grant execute on function private.uuid_from_first_path_segment(text) to authenticated;
grant execute on function private.can_insert_zivo_service_photo(text, uuid, uuid) to authenticated;
grant execute on function private.can_read_zivo_service_photo(text, uuid) to authenticated;

drop policy if exists "zivo_service_photos_insert" on storage.objects;
create policy "zivo_service_photos_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'zivo-service-photos'
  and private.can_insert_zivo_service_photo(name, owner, (select auth.uid()))
);

drop policy if exists "zivo_service_photos_read" on storage.objects;
create policy "zivo_service_photos_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'zivo-service-photos'
  and private.can_read_zivo_service_photo(name, (select auth.uid()))
);
