
-- Add sequential employee_number to store_employees
ALTER TABLE public.store_employees
ADD COLUMN employee_number SERIAL;

-- Create unique constraint per store
CREATE UNIQUE INDEX idx_store_employees_number ON public.store_employees (store_id, employee_number);
