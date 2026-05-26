
CREATE TABLE public.store_employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'cashier', 'staff')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  hourly_rate NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.store_employees ENABLE ROW LEVEL SECURITY;

-- Store owners can view their store's employees
CREATE POLICY "Store owners can view their employees"
ON public.store_employees
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = store_employees.store_id
    AND store_profiles.owner_id = auth.uid()
  )
  OR user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

-- Store owners can add employees
CREATE POLICY "Store owners can insert employees"
ON public.store_employees
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = store_employees.store_id
    AND store_profiles.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Store owners can update their employees
CREATE POLICY "Store owners can update employees"
ON public.store_employees
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = store_employees.store_id
    AND store_profiles.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Store owners can delete employees
CREATE POLICY "Store owners can delete employees"
ON public.store_employees
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = store_employees.store_id
    AND store_profiles.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Trigger for updated_at
CREATE TRIGGER update_store_employees_updated_at
BEFORE UPDATE ON public.store_employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
