-- Track when a service booking has been converted to a work order
ALTER TABLE public.service_bookings
  ADD COLUMN IF NOT EXISTS workorder_id uuid REFERENCES public.ar_work_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_service_bookings_workorder ON public.service_bookings(workorder_id) WHERE workorder_id IS NOT NULL;
