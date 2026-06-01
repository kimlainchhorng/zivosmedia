-- Explicit Data API grants for store training and rule-book workflows.
-- RLS policies remain the row-level authority for owner/admin/staff access.

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.store_training_programs to authenticated;
grant select, insert, update, delete on table public.store_training_modules to authenticated;
grant select, insert, update, delete on table public.store_training_assignments to authenticated;
grant select, insert, update, delete on table public.store_employee_rules to authenticated;

grant all privileges on table public.store_training_programs to service_role;
grant all privileges on table public.store_training_modules to service_role;
grant all privileges on table public.store_training_assignments to service_role;
grant all privileges on table public.store_employee_rules to service_role;
