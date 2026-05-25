-- Cafe expenses — everything that costs the cafe money outside the POS:
-- coffee beans, milk, dairy delivery, rent, utilities, equipment, marketing.
-- Categories are a free-form text (curated UI-side) so owners can add their
-- own without a schema change.

CREATE TABLE IF NOT EXISTS public.cafe_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  -- e.g. "Beans", "Dairy", "Rent", "Utilities", "Marketing", "Equipment", "Other"
  category TEXT NOT NULL CHECK (char_length(category) BETWEEN 1 AND 60),
  vendor TEXT CHECK (vendor IS NULL OR char_length(vendor) <= 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),

  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),

  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT
    CHECK (payment_method IS NULL OR payment_method IN ('cash', 'card', 'bank_transfer', 'qr', 'other')),

  -- Marks recurring monthly bills (rent, internet) so reports can split fixed
  -- vs. variable cost.
  is_recurring BOOLEAN NOT NULL DEFAULT false,

  -- Optional receipt photo / PDF.
  receipt_url TEXT,

  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_expenses_store_date_idx
  ON public.cafe_expenses (store_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS cafe_expenses_store_category_idx
  ON public.cafe_expenses (store_id, category);

DROP TRIGGER IF EXISTS cafe_expenses_set_updated_at ON public.cafe_expenses;
CREATE TRIGGER cafe_expenses_set_updated_at
  BEFORE UPDATE ON public.cafe_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe expenses - all"
  ON public.cafe_expenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_expenses.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_expenses.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
