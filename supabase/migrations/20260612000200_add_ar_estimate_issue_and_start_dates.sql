-- Auto-repair estimates need an issue date (defaults to today) and a start
-- date, alongside the existing promised_at (Due). Shown on the estimate/invoice
-- and editable from the Build R.O. header. Additive + idempotent.
-- Applied to the linked project via apply_migration; committed for repo sync.
alter table public.ar_estimates add column if not exists estimate_date date;
alter table public.ar_estimates add column if not exists start_date date;

-- Backfill existing estimates' issue date from their creation date (not today).
update public.ar_estimates set estimate_date = created_at::date where estimate_date is null;

-- New estimates default the issue date to today at the DB level.
alter table public.ar_estimates alter column estimate_date set default current_date;

comment on column public.ar_estimates.estimate_date is 'Issue/estimate date shown on the estimate & invoice (defaults to today).';
comment on column public.ar_estimates.start_date is 'Planned start date for the work.';
