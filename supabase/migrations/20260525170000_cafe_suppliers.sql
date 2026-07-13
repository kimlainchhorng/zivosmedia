-- Cafe suppliers — vendor directory used by purchase orders.

CREATE TABLE IF NOT EXISTS public.cafe_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  contact_name TEXT CHECK (contact_name IS NULL OR char_length(contact_name) <= 120),
  phone TEXT,
  email TEXT,
  address TEXT CHECK (address IS NULL OR char_length(address) <= 500),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),

  -- Free-form: "Net 30", "COD", "Prepaid", etc.
  payment_terms TEXT CHECK (payment_terms IS NULL OR char_length(payment_terms) <= 60),
  lead_time_days INTEGER CHECK (lead_time_days IS NULL OR lead_time_days BETWEEN 0 AND 365),

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_suppliers_store_idx
  ON public.cafe_suppliers (store_id, sort_order);

DROP TRIGGER IF EXISTS cafe_suppliers_set_updated_at ON public.cafe_suppliers;
CREATE TRIGGER cafe_suppliers_set_updated_at
  BEFORE UPDATE ON public.cafe_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe suppliers - all"
  ON public.cafe_suppliers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_suppliers.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_suppliers.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
