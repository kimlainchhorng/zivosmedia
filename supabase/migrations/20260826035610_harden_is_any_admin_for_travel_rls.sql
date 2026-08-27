-- Repair travel-table RLS policies after the Phase 9 SECURITY DEFINER
-- lockdown revoked authenticated EXECUTE on public.is_any_admin(uuid). The
-- affected policies still call that helper, so signed-in customer requests
-- fail with 42501 before the owner policy can return rows.
--
-- Keep the public helper locked. Route only the four affected authenticated
-- travel policies through a current-caller helper in the existing non-exposed
-- private schema instead of publishing a role-check RPC through PostgREST.

create schema if not exists private;

create or replace function private.current_user_is_any_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role in ('admin', 'super_admin', 'operations', 'finance', 'support')
    );
$$;

revoke execute on function public.is_any_admin(uuid)
  from public, anon, authenticated;

revoke all on function private.current_user_is_any_admin()
  from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;
grant execute on function private.current_user_is_any_admin()
  to authenticated, service_role;

alter policy "Admins can view all travel order items"
on public.travel_order_items
using ((select private.current_user_is_any_admin()));

alter policy "Admins can view all travel orders"
on public.travel_orders
using ((select private.current_user_is_any_admin()));

alter policy "merged_update_authenticated"
on public.travel_orders
using (
  (select private.current_user_is_any_admin())
  or user_id = (select auth.uid())
);

alter policy "Admins can view all travel payments"
on public.travel_payments
using ((select private.current_user_is_any_admin()));

notify pgrst, 'reload schema';
