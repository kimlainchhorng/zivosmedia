-- Allow verified driver clients to maintain their own availability row.
-- This unblocks the driver "Go Online" toggle while keeping dispatch status
-- scoped to the authenticated driver's linked public.drivers row.

alter table public.drivers_status enable row level security;

grant select, insert, update on public.drivers_status to authenticated;

drop policy if exists "drivers_status_select_own_or_admin" on public.drivers_status;
drop policy if exists "drivers_status_insert_own_or_admin" on public.drivers_status;
drop policy if exists "drivers_status_update_own_or_admin" on public.drivers_status;

create policy "drivers_status_select_own_or_admin"
on public.drivers_status
for select
to authenticated
using (
  driver_id in (select id from public.drivers where user_id = auth.uid())
  or public.has_role(auth.uid(), 'admin')
);

create policy "drivers_status_insert_own_or_admin"
on public.drivers_status
for insert
to authenticated
with check (
  driver_id in (select id from public.drivers where user_id = auth.uid())
  or public.has_role(auth.uid(), 'admin')
);

create policy "drivers_status_update_own_or_admin"
on public.drivers_status
for update
to authenticated
using (
  driver_id in (select id from public.drivers where user_id = auth.uid())
  or public.has_role(auth.uid(), 'admin')
)
with check (
  driver_id in (select id from public.drivers where user_id = auth.uid())
  or public.has_role(auth.uid(), 'admin')
);
