-- 1) Extend ar_expenses
ALTER TABLE public.ar_expenses
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS invoice_time time,
  ADD COLUMN IF NOT EXISTS subtotal_cents integer,
  ADD COLUMN IF NOT EXISTS tax_cents integer,
  ADD COLUMN IF NOT EXISTS receipt_url text;

-- 2) Line items table
CREATE TABLE IF NOT EXISTS public.ar_expense_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.ar_expenses(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  part_number text,
  name text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  line_total_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_expense_items_expense ON public.ar_expense_items(expense_id);

ALTER TABLE public.ar_expense_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ar_expense_items' AND policyname='Owners manage their ar_expense_items') THEN
    CREATE POLICY "Owners manage their ar_expense_items" ON public.ar_expense_items
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.ar_expenses e
          JOIN public.restaurants r ON r.id = e.store_id
          WHERE e.id = ar_expense_items.expense_id AND r.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.ar_expenses e
          JOIN public.restaurants r ON r.id = e.store_id
          WHERE e.id = ar_expense_items.expense_id AND r.owner_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ar_expense_items' AND policyname='Admins manage all ar_expense_items') THEN
    CREATE POLICY "Admins manage all ar_expense_items" ON public.ar_expense_items
      FOR ALL TO authenticated
      USING (has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 3) Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('ar-receipts', 'ar-receipts', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ar_receipts_select') THEN
    CREATE POLICY ar_receipts_select ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'ar-receipts' AND (
          has_role(auth.uid(), 'admin') OR
          EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ar_receipts_insert') THEN
    CREATE POLICY ar_receipts_insert ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'ar-receipts' AND (
          has_role(auth.uid(), 'admin') OR
          EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ar_receipts_update') THEN
    CREATE POLICY ar_receipts_update ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'ar-receipts' AND (
          has_role(auth.uid(), 'admin') OR
          EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='ar_receipts_delete') THEN
    CREATE POLICY ar_receipts_delete ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'ar-receipts' AND (
          has_role(auth.uid(), 'admin') OR
          EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
        )
      );
  END IF;
END $$;