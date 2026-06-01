-- Explicit Data API grants for shop owner, employee, and customer order
-- workflows. RLS policies remain the authority for which rows each role can
-- see or mutate.

grant usage on schema public to anon, authenticated;

-- Public storefront discovery/catalog reads.
grant select on table public.store_profiles to anon, authenticated;
grant select on table public.store_products to anon, authenticated;

-- Authenticated owner/customer order workflow. Customers can create and update
-- their own orders; store owners can view/update orders for stores they own.
grant select, insert, update on table public.store_orders to authenticated;

-- Authenticated shop team workflow. Owner and employee visibility is scoped by
-- RLS through store_profiles.owner_id and store_employees.user_id.
grant select, insert, update, delete on table public.store_employees to authenticated;
grant select, insert, update on table public.store_employee_invites to authenticated;
grant select, insert, update, delete on table public.employee_shifts to authenticated;
grant select, insert, update, delete on table public.employee_rules to authenticated;
grant select, insert, update, delete on table public.employee_rule_acknowledgements to authenticated;

-- Server-only/admin operations stay explicit for service-role clients.
grant all privileges on table public.store_profiles to service_role;
grant all privileges on table public.store_products to service_role;
grant all privileges on table public.store_orders to service_role;
grant all privileges on table public.store_employees to service_role;
grant all privileges on table public.store_employee_invites to service_role;
grant all privileges on table public.employee_shifts to service_role;
grant all privileges on table public.employee_rules to service_role;
grant all privileges on table public.employee_rule_acknowledgements to service_role;
