-- Phase 11: Real Employee Rules backend
CREATE TABLE IF NOT EXISTS public.store_employee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Workplace Conduct',
  description text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  applies_to text NOT NULL DEFAULT 'All Staff',
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_employee_rules_store_idx
  ON public.store_employee_rules(store_id, position, created_at);

ALTER TABLE public.store_employee_rules ENABLE ROW LEVEL SECURITY;

-- Reuse existing security-definer helper that returns true for store owners + platform admins.
CREATE POLICY "Store managers can view employee rules"
  ON public.store_employee_rules
  FOR SELECT
  TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()));

CREATE POLICY "Store managers can insert employee rules"
  ON public.store_employee_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_lodge_store_manager(store_id, auth.uid())
    AND created_by = auth.uid()
  );

CREATE POLICY "Store managers can update employee rules"
  ON public.store_employee_rules
  FOR UPDATE
  TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()))
  WITH CHECK (public.is_lodge_store_manager(store_id, auth.uid()));

CREATE POLICY "Store managers can delete employee rules"
  ON public.store_employee_rules
  FOR DELETE
  TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()));

-- Auto-update updated_at on every row update (reuse existing helper if present)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_store_employee_rules_updated ON public.store_employee_rules;
CREATE TRIGGER trg_store_employee_rules_updated
  BEFORE UPDATE ON public.store_employee_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();