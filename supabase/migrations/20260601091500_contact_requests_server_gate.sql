-- Force contact request lifecycle writes through contact-request-manage and
-- contact-manage so sender/recipient roles are enforced by trusted code.

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contact_requests_block_direct_insert ON public.contact_requests;
DROP POLICY IF EXISTS contact_requests_block_direct_update ON public.contact_requests;
DROP POLICY IF EXISTS contact_requests_block_direct_delete ON public.contact_requests;

CREATE POLICY contact_requests_block_direct_insert
ON public.contact_requests
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY contact_requests_block_direct_update
ON public.contact_requests
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY contact_requests_block_direct_delete
ON public.contact_requests
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY contact_requests_block_direct_insert ON public.contact_requests
IS 'Blocks direct authenticated contact request inserts; use contact-request-manage for trusted server-side ingestion.';

COMMENT ON POLICY contact_requests_block_direct_update ON public.contact_requests
IS 'Blocks direct authenticated contact request updates; use contact-request-manage or contact-manage for trusted server-side ingestion.';

COMMENT ON POLICY contact_requests_block_direct_delete ON public.contact_requests
IS 'Blocks direct authenticated contact request deletes; use contact-request-manage for trusted server-side ingestion.';
