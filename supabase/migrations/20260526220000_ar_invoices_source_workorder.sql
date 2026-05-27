-- Auto Repair — link invoice back to the work order it was generated from
-- The Work Order → Invoice conversion writes source_workorder_id but the
-- column did not exist, so the linkage was being silently dropped.

alter table public.ar_invoices
  add column if not exists source_workorder_id uuid references public.ar_work_orders(id) on delete set null;

create index if not exists idx_ar_invoices_source_workorder
  on public.ar_invoices(source_workorder_id)
  where source_workorder_id is not null;
