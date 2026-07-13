ALTER TABLE public.store_employees
ADD COLUMN pay_type text NOT NULL DEFAULT 'hourly'
CHECK (pay_type IN ('hourly', 'monthly'));