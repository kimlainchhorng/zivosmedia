-- Auto Repair — add discount_cents to ar_estimates so the same totals split
-- (subtotal/discount/tax/total) used by ar_invoices works for estimates too.
-- The AutoRepairInvoicesSection now writes discount_cents on save for both
-- doc types; without this column, inserts to ar_estimates fail.

alter table public.ar_estimates
  add column if not exists discount_cents integer not null default 0;
