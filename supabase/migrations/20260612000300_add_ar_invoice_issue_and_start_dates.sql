-- Mirror the estimate's issue/start dates onto invoices (denormalized at
-- estimate->invoice conversion, like promised_at/po_number already are) so they
-- render on the invoice document. Additive + idempotent.
-- Applied to the linked project via apply_migration; committed for repo sync.
alter table public.ar_invoices add column if not exists estimate_date date;
alter table public.ar_invoices add column if not exists start_date date;

update public.ar_invoices set estimate_date = created_at::date where estimate_date is null;

alter table public.ar_invoices alter column estimate_date set default current_date;

comment on column public.ar_invoices.estimate_date is 'Issue date shown on the invoice (carried from the estimate; defaults to today).';
comment on column public.ar_invoices.start_date is 'Planned start date for the work (carried from the estimate).';
