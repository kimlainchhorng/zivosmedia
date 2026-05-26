-- Employee workflow: persistent shifts, rules, rule acknowledgements,
-- and per-employee truck assignment. Replaces localStorage on the iOS app
-- so schedules and rules sync across devices and to web admin.

-- ─── 1. assigned_truck_label on store_employees ─────────────────────
ALTER TABLE public.store_employees
  ADD COLUMN IF NOT EXISTS assigned_truck_label TEXT;

CREATE INDEX IF NOT EXISTS idx_store_employees_assigned_truck
  ON public.store_employees(store_id, assigned_truck_label);

-- ─── 2. employee_shifts ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.store_employees(id) ON DELETE CASCADE,
  day_index SMALLINT NOT NULL CHECK (day_index BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  role TEXT,
  week_offset INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_shifts_store_week
  ON public.employee_shifts(store_id, week_offset, day_index);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_employee
  ON public.employee_shifts(employee_id, week_offset);

ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view shifts"
ON public.employee_shifts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = employee_shifts.store_id
      AND store_profiles.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.store_employees
    WHERE store_employees.id = employee_shifts.employee_id
      AND store_employees.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Store owners can insert shifts"
ON public.employee_shifts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = employee_shifts.store_id
      AND store_profiles.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Store owners can update shifts"
ON public.employee_shifts FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = employee_shifts.store_id
      AND store_profiles.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Store owners can delete shifts"
ON public.employee_shifts FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = employee_shifts.store_id
      AND store_profiles.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER update_employee_shifts_updated_at
BEFORE UPDATE ON public.employee_shifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 3. employee_rules ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_rules_store
  ON public.employee_rules(store_id, position);

ALTER TABLE public.employee_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view rules"
ON public.employee_rules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = employee_rules.store_id
      AND store_profiles.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.store_employees
    WHERE store_employees.store_id = employee_rules.store_id
      AND store_employees.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Store owners can insert rules"
ON public.employee_rules FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = employee_rules.store_id
      AND store_profiles.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Store owners can update rules"
ON public.employee_rules FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = employee_rules.store_id
      AND store_profiles.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Store owners can delete rules"
ON public.employee_rules FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.store_profiles
    WHERE store_profiles.id = employee_rules.store_id
      AND store_profiles.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER update_employee_rules_updated_at
BEFORE UPDATE ON public.employee_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ─── 4. employee_rule_acknowledgements ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.employee_rule_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES public.employee_rules(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.store_employees(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rule_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_rule_ack_employee
  ON public.employee_rule_acknowledgements(employee_id);
CREATE INDEX IF NOT EXISTS idx_rule_ack_rule
  ON public.employee_rule_acknowledgements(rule_id);

ALTER TABLE public.employee_rule_acknowledgements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner and acker can view acks"
ON public.employee_rule_acknowledgements FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.employee_rules r
    JOIN public.store_profiles sp ON sp.id = r.store_id
    WHERE r.id = employee_rule_acknowledgements.rule_id
      AND sp.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.store_employees e
    WHERE e.id = employee_rule_acknowledgements.employee_id
      AND e.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Employees can ack their own rules"
ON public.employee_rule_acknowledgements FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.store_employees e
    WHERE e.id = employee_rule_acknowledgements.employee_id
      AND e.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.employee_rules r
    JOIN public.store_profiles sp ON sp.id = r.store_id
    WHERE r.id = employee_rule_acknowledgements.rule_id
      AND sp.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Owner can clear acks"
ON public.employee_rule_acknowledgements FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.employee_rules r
    JOIN public.store_profiles sp ON sp.id = r.store_id
    WHERE r.id = employee_rule_acknowledgements.rule_id
      AND sp.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.store_employees e
    WHERE e.id = employee_rule_acknowledgements.employee_id
      AND e.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);
