CREATE TABLE public.store_time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.store_employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view store time entries"
ON public.store_time_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_profiles sp
    WHERE sp.id = store_time_entries.store_id
      AND sp.owner_id = auth.uid()
  )
);

CREATE POLICY "Employees can view their own store time entries"
ON public.store_time_entries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_employees se
    WHERE se.id = store_time_entries.employee_id
      AND se.user_id = auth.uid()
  )
);

CREATE INDEX idx_store_time_entries_store_clock_in
  ON public.store_time_entries (store_id, clock_in DESC);

CREATE INDEX idx_store_time_entries_employee_clock_in
  ON public.store_time_entries (employee_id, clock_in DESC);

CREATE UNIQUE INDEX idx_store_time_entries_one_open_shift_per_employee
  ON public.store_time_entries (employee_id)
  WHERE clock_out IS NULL;