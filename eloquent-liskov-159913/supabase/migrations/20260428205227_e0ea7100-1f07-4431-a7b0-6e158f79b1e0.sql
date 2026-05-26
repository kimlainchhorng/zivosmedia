INSERT INTO storage.buckets (id, name, public)
VALUES ('ar-receipts-fallback', 'ar-receipts-fallback', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS ar_receipts_fallback_select ON storage.objects;
CREATE POLICY ar_receipts_fallback_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'ar-receipts-fallback' AND (
      public.has_role(auth.uid(), 'admin'::app_role) OR
      EXISTS (
        SELECT 1 FROM public.store_profiles sp
        WHERE sp.id::text = (storage.foldername(storage.objects.name))[1]
          AND sp.owner_id = auth.uid()
      )
    )
  );

NOTIFY pgrst, 'reload schema';