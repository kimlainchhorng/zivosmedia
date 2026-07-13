-- Store document metadata must be mutated through store-document-manage so
-- owners/admins cannot forge uploader, employee, or storage-path ownership.

ALTER TABLE public.store_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Managers can create documents" ON public.store_documents;
DROP POLICY IF EXISTS "Managers can update documents" ON public.store_documents;
DROP POLICY IF EXISTS "Managers can delete documents" ON public.store_documents;

CREATE POLICY "Store document inserts require trusted server-side validation"
  ON public.store_documents
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Store document updates require trusted server-side validation"
  ON public.store_documents
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Store document deletes require trusted server-side validation"
  ON public.store_documents
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_documents FROM anon, authenticated;
GRANT SELECT ON TABLE public.store_documents TO authenticated;
GRANT ALL ON TABLE public.store_documents TO service_role;
