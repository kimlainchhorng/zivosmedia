-- ar_expenses: owner check via store_profiles
DROP POLICY IF EXISTS "Owners manage their ar_expenses" ON public.ar_expenses;
CREATE POLICY "Owners manage their ar_expenses" ON public.ar_expenses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = ar_expenses.store_id AND sp.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ar_expenses.store_id AND r.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = ar_expenses.store_id AND sp.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ar_expenses.store_id AND r.owner_id = auth.uid())
  );

-- ar_expense_items: owner check via ar_expenses -> store_profiles
DROP POLICY IF EXISTS "Owners manage their ar_expense_items" ON public.ar_expense_items;
CREATE POLICY "Owners manage their ar_expense_items" ON public.ar_expense_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ar_expenses e
      LEFT JOIN public.store_profiles sp ON sp.id = e.store_id
      LEFT JOIN public.restaurants r ON r.id = e.store_id
      WHERE e.id = ar_expense_items.expense_id
        AND (sp.owner_id = auth.uid() OR r.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ar_expenses e
      LEFT JOIN public.store_profiles sp ON sp.id = e.store_id
      LEFT JOIN public.restaurants r ON r.id = e.store_id
      WHERE e.id = ar_expense_items.expense_id
        AND (sp.owner_id = auth.uid() OR r.owner_id = auth.uid())
    )
  );

-- Storage policies for ar-receipts: fix folder check (was r.name, must be objects.name)
DROP POLICY IF EXISTS ar_receipts_select ON storage.objects;
DROP POLICY IF EXISTS ar_receipts_insert ON storage.objects;
DROP POLICY IF EXISTS ar_receipts_update ON storage.objects;
DROP POLICY IF EXISTS ar_receipts_delete ON storage.objects;

CREATE POLICY ar_receipts_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ar-receipts' AND (
      has_role(auth.uid(), 'admin') OR
      EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id::text = (storage.foldername(name))[1] AND sp.owner_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
    )
  );

CREATE POLICY ar_receipts_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ar-receipts' AND (
      has_role(auth.uid(), 'admin') OR
      EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id::text = (storage.foldername(name))[1] AND sp.owner_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
    )
  );

CREATE POLICY ar_receipts_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ar-receipts' AND (
      has_role(auth.uid(), 'admin') OR
      EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id::text = (storage.foldername(name))[1] AND sp.owner_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
    )
  );

CREATE POLICY ar_receipts_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ar-receipts' AND (
      has_role(auth.uid(), 'admin') OR
      EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id::text = (storage.foldername(name))[1] AND sp.owner_id = auth.uid()) OR
      EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id::text = (storage.foldername(name))[1] AND r.owner_id = auth.uid())
    )
  );