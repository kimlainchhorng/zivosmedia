-- Soft delete + send tracking on invoices
ALTER TABLE public.ar_invoices
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ar_invoices_store_active
  ON public.ar_invoices (store_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Expand estimates table to mirror invoice details
ALTER TABLE public.ar_estimates
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS vin text,
  ADD COLUMN IF NOT EXISTS vehicle_year text,
  ADD COLUMN IF NOT EXISTS vehicle_make text,
  ADD COLUMN IF NOT EXISTS vehicle_model text,
  ADD COLUMN IF NOT EXISTS items jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS customer_notes text,
  ADD COLUMN IF NOT EXISTS diagnosis_notes text,
  ADD COLUMN IF NOT EXISTS converted_invoice_id uuid;

CREATE INDEX IF NOT EXISTS idx_ar_estimates_store_active
  ON public.ar_estimates (store_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Public share links for sent documents
CREATE TABLE IF NOT EXISTS public.ar_document_share_links (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  doc_id uuid NOT NULL,
  doc_type text NOT NULL CHECK (doc_type IN ('invoice','estimate')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '60 days'),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ar_share_links_doc
  ON public.ar_document_share_links (doc_id, doc_type);

ALTER TABLE public.ar_document_share_links ENABLE ROW LEVEL SECURITY;

-- Anonymous read by token (used by the public /d/:token page).
-- Row is only returned if it is unexpired and not revoked.
CREATE POLICY "Public can read valid share links"
  ON public.ar_document_share_links
  FOR SELECT
  TO anon, authenticated
  USING (revoked_at IS NULL AND expires_at > now());

-- Only authenticated store team members can manage links.
-- (Insert/revoke happens through the admin UI under an authenticated session.)
CREATE POLICY "Authenticated users can create share links for their store docs"
  ON public.ar_document_share_links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update share links they created"
  ON public.ar_document_share_links
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Public RPC: resolve a share token to its document content (read-only).
-- This avoids exposing the underlying tables to anon while still allowing
-- the /d/:token page to render the invoice/estimate.
CREATE OR REPLACE FUNCTION public.get_shared_document(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  link RECORD;
  doc jsonb;
BEGIN
  SELECT * INTO link FROM public.ar_document_share_links
  WHERE token = _token
    AND revoked_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF link.doc_type = 'invoice' THEN
    SELECT to_jsonb(i.*) INTO doc
    FROM public.ar_invoices i
    WHERE i.id = link.doc_id AND i.deleted_at IS NULL;
  ELSE
    SELECT to_jsonb(e.*) INTO doc
    FROM public.ar_estimates e
    WHERE e.id = link.doc_id AND e.deleted_at IS NULL;
  END IF;

  IF doc IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'doc_type', link.doc_type,
    'doc', doc,
    'store_id', link.store_id,
    'expires_at', link.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_document(uuid) TO anon, authenticated;