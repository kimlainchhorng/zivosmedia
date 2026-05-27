-- 1) ar_expenses: drop ALL existing policies, recreate using store_profiles only
DROP POLICY IF EXISTS "Owners manage their ar_expenses" ON public.ar_expenses;
DROP POLICY IF EXISTS "Admins manage all ar_expenses" ON public.ar_expenses;

CREATE POLICY "Owners manage their ar_expenses" ON public.ar_expenses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = ar_expenses.store_id AND sp.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = ar_expenses.store_id AND sp.owner_id = auth.uid())
  );

CREATE POLICY "Admins manage all ar_expenses" ON public.ar_expenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- 2) ar_expense_items: drop ALL, recreate via ar_expenses -> store_profiles
DROP POLICY IF EXISTS "Owners manage their ar_expense_items" ON public.ar_expense_items;
DROP POLICY IF EXISTS "Admins manage all ar_expense_items" ON public.ar_expense_items;

CREATE POLICY "Owners manage their ar_expense_items" ON public.ar_expense_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ar_expenses e
      JOIN public.store_profiles sp ON sp.id = e.store_id
      WHERE e.id = ar_expense_items.expense_id AND sp.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ar_expenses e
      JOIN public.store_profiles sp ON sp.id = e.store_id
      WHERE e.id = ar_expense_items.expense_id AND sp.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage all ar_expense_items" ON public.ar_expense_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::text))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::text));

-- 3) Storage policies for ar-receipts: qualify "name" with storage.objects to ensure
-- foldername() reads the file path (not store_profiles.name).
DROP POLICY IF EXISTS ar_receipts_select ON storage.objects;
DROP POLICY IF EXISTS ar_receipts_insert ON storage.objects;
DROP POLICY IF EXISTS ar_receipts_update ON storage.objects;
DROP POLICY IF EXISTS ar_receipts_delete ON storage.objects;

CREATE POLICY ar_receipts_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ar-receipts' AND (
      public.has_role(auth.uid(), 'admin'::text) OR
      EXISTS (
        SELECT 1 FROM public.store_profiles sp
        WHERE sp.id::text = (storage.foldername(storage.objects.name))[1]
          AND sp.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY ar_receipts_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ar-receipts' AND (
      public.has_role(auth.uid(), 'admin'::text) OR
      EXISTS (
        SELECT 1 FROM public.store_profiles sp
        WHERE sp.id::text = (storage.foldername(storage.objects.name))[1]
          AND sp.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY ar_receipts_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ar-receipts' AND (
      public.has_role(auth.uid(), 'admin'::text) OR
      EXISTS (
        SELECT 1 FROM public.store_profiles sp
        WHERE sp.id::text = (storage.foldername(storage.objects.name))[1]
          AND sp.owner_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'ar-receipts' AND (
      public.has_role(auth.uid(), 'admin'::text) OR
      EXISTS (
        SELECT 1 FROM public.store_profiles sp
        WHERE sp.id::text = (storage.foldername(storage.objects.name))[1]
          AND sp.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY ar_receipts_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ar-receipts' AND (
      public.has_role(auth.uid(), 'admin'::text) OR
      EXISTS (
        SELECT 1 FROM public.store_profiles sp
        WHERE sp.id::text = (storage.foldername(storage.objects.name))[1]
          AND sp.owner_id = auth.uid()
      )
    )
  );

-- 4) Ensure data API privileges are present
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ar_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ar_expense_items TO authenticated;
GRANT SELECT ON public.store_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;

-- 5) Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';