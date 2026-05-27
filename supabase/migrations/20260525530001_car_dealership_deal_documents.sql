------------------------------------------------------------------------
-- Car dealership — per-deal document attachments
--
-- File metadata table for deal paperwork (purchase agreement, title,
-- registration, financing contracts, insurance, etc.). Each row points to
-- a file stored in the `store-assets` storage bucket under
--   <storeId>/deal-documents/<dealId>/<file>
--
-- Immutable: no updated_at. A doc is uploaded once; deleting the row also
-- cleans up the storage object (best-effort, handled in the client).
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_dealership_deal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES public.car_dealership_sales(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'purchase_agreement',
    'bill_of_sale',
    'title',
    'registration',
    'financing_contract',
    'insurance',
    'license_copy',
    'lemon_law_disclosure',
    'warranty',
    'inspection',
    'odometer_disclosure',
    'photo',
    'other'
  )),

  file_url TEXT NOT NULL CHECK (char_length(file_url) <= 1000),
  file_path TEXT NOT NULL CHECK (char_length(file_path) <= 500),
  file_name TEXT NOT NULL CHECK (char_length(file_name) <= 255),
  file_size_bytes BIGINT,
  mime_type TEXT CHECK (mime_type IS NULL OR char_length(mime_type) <= 100),

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_dealership_deal_documents_deal_idx
  ON public.car_dealership_deal_documents (deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS car_dealership_deal_documents_store_idx
  ON public.car_dealership_deal_documents (store_id, created_at DESC);

------------------------------------------------------------------------
-- RLS — owners + admins manage everything for their store.
------------------------------------------------------------------------

ALTER TABLE public.car_dealership_deal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage car_dealership_deal_documents - select"
  ON public.car_dealership_deal_documents;
CREATE POLICY "Owners manage car_dealership_deal_documents - select"
  ON public.car_dealership_deal_documents FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_dealership_deal_documents.store_id
              AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Owners manage car_dealership_deal_documents - insert"
  ON public.car_dealership_deal_documents;
CREATE POLICY "Owners manage car_dealership_deal_documents - insert"
  ON public.car_dealership_deal_documents FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_dealership_deal_documents.store_id
              AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Owners manage car_dealership_deal_documents - update"
  ON public.car_dealership_deal_documents;
CREATE POLICY "Owners manage car_dealership_deal_documents - update"
  ON public.car_dealership_deal_documents FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_dealership_deal_documents.store_id
              AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_dealership_deal_documents.store_id
              AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Owners manage car_dealership_deal_documents - delete"
  ON public.car_dealership_deal_documents;
CREATE POLICY "Owners manage car_dealership_deal_documents - delete"
  ON public.car_dealership_deal_documents FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_dealership_deal_documents.store_id
              AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

COMMENT ON TABLE public.car_dealership_deal_documents IS
  'Per-deal document attachments (purchase agreement, title, financing docs, insurance, etc.). Files stored in store-assets bucket under <storeId>/deal-documents/<dealId>/.';
