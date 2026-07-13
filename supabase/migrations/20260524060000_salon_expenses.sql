-- Salon expense tracking. Lightweight per-store ledger of outgoing money:
-- supplies, rent, utilities, etc. Reports & finance views read from here.

CREATE TABLE IF NOT EXISTS public.salon_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),

  category TEXT NOT NULL DEFAULT 'Other'
    CHECK (char_length(category) BETWEEN 1 AND 40),
  vendor TEXT CHECK (vendor IS NULL OR char_length(vendor) <= 80),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 1 AND 200),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),

  receipt_url TEXT,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence TEXT CHECK (recurrence IS NULL OR recurrence IN ('weekly', 'monthly', 'quarterly', 'yearly')),

  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_expenses_store_date_idx
  ON public.salon_expenses (store_id, expense_date DESC);

CREATE OR REPLACE FUNCTION public.tg_salon_expenses_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_expenses_set_updated_at ON public.salon_expenses;
CREATE TRIGGER salon_expenses_set_updated_at
  BEFORE UPDATE ON public.salon_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_expenses_set_updated_at();

ALTER TABLE public.salon_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their expenses - all"
  ON public.salon_expenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_expenses.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_expenses.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
