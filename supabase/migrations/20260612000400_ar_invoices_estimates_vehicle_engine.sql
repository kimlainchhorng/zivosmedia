-- Persist the decoded/entered engine so it prints on reopened invoices/estimates.
alter table public.ar_invoices add column if not exists vehicle_engine text;
alter table public.ar_estimates add column if not exists vehicle_engine text;
