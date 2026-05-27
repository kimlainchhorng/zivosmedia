-- Auto Repair — service reminders: add customer/vehicle text fields + WO source.
-- The Reminders UI writes customer_name, customer_phone, vehicle_label, and we
-- now auto-create reminders from a completed work order; without these columns
-- the inserts silently drop those values and the reminder cards show "Unknown".

alter table public.ar_service_reminders
  add column if not exists customer_name text,
  add column if not exists customer_phone text,
  add column if not exists customer_email text,
  add column if not exists vehicle_label text,
  add column if not exists source_workorder_id uuid references public.ar_work_orders(id) on delete set null;

create index if not exists idx_ar_service_reminders_source_wo
  on public.ar_service_reminders(source_workorder_id)
  where source_workorder_id is not null;

-- Prevent duplicate auto-created reminders for the same WO + service type
create unique index if not exists ux_ar_service_reminders_wo_type
  on public.ar_service_reminders(source_workorder_id, reminder_type)
  where source_workorder_id is not null;
