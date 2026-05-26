CREATE TABLE IF NOT EXISTS public.ar_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  estimate_id UUID,
  number TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_address TEXT,
  vehicle_label TEXT,
  vin TEXT,
  vehicle_year TEXT,
  vehicle_make TEXT,
  vehicle_model TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  amount_paid_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_store ON public.ar_invoices(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_status ON public.ar_invoices(store_id, status);

CREATE TABLE IF NOT EXISTS public.ar_invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  invoice_id UUID NOT NULL REFERENCES public.ar_invoices(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash',
  reference TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_invoice_payments_store ON public.ar_invoice_payments(store_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_invoice_payments_invoice ON public.ar_invoice_payments(invoice_id);

CREATE TABLE IF NOT EXISTS public.ar_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  vendor TEXT,
  description TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  payment_method TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_expenses_store ON public.ar_expenses(store_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_ar_expenses_category ON public.ar_expenses(store_id, category);

CREATE TABLE IF NOT EXISTS public.ar_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  payout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_payouts_store ON public.ar_payouts(store_id, payout_date DESC);

ALTER TABLE public.ar_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ar_payouts ENABLE ROW LEVEL SECURITY;

-- Mirror existing ar_ table policy pattern (uses restaurants.owner_id)
CREATE POLICY "Owners manage their ar_invoices" ON public.ar_invoices
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = ar_invoices.store_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = ar_invoices.store_id AND r.owner_id = auth.uid()));
CREATE POLICY "Admins manage all ar_invoices" ON public.ar_invoices
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Owners manage their ar_invoice_payments" ON public.ar_invoice_payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = ar_invoice_payments.store_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = ar_invoice_payments.store_id AND r.owner_id = auth.uid()));
CREATE POLICY "Admins manage all ar_invoice_payments" ON public.ar_invoice_payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Owners manage their ar_expenses" ON public.ar_expenses
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = ar_expenses.store_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = ar_expenses.store_id AND r.owner_id = auth.uid()));
CREATE POLICY "Admins manage all ar_expenses" ON public.ar_expenses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE POLICY "Owners manage their ar_payouts" ON public.ar_payouts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = ar_payouts.store_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM restaurants r WHERE r.id = ar_payouts.store_id AND r.owner_id = auth.uid()));
CREATE POLICY "Admins manage all ar_payouts" ON public.ar_payouts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE TRIGGER trg_ar_invoices_updated
  BEFORE UPDATE ON public.ar_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_ar_expenses_updated
  BEFORE UPDATE ON public.ar_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-recompute amount_paid + status when payments change
CREATE OR REPLACE FUNCTION public.ar_recalc_invoice_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_total INTEGER;
  v_paid INTEGER;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT total_cents INTO v_total FROM public.ar_invoices WHERE id = v_invoice_id;
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_paid
    FROM public.ar_invoice_payments WHERE invoice_id = v_invoice_id;

  UPDATE public.ar_invoices
  SET amount_paid_cents = v_paid,
      status = CASE
        WHEN v_paid >= v_total AND v_total > 0 THEN 'paid'
        WHEN v_paid > 0 THEN 'partial'
        ELSE status
      END,
      paid_at = CASE
        WHEN v_paid >= v_total AND v_total > 0 THEN now()
        ELSE paid_at
      END
  WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_ar_invoice_payments_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.ar_invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.ar_recalc_invoice_payment();