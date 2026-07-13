-- Force contact-list writes through contact-manage so owner_id attribution,
-- reciprocal request acceptance, and patch validation are server-owned.

ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_contacts_block_direct_insert ON public.user_contacts;
DROP POLICY IF EXISTS user_contacts_block_direct_update ON public.user_contacts;
DROP POLICY IF EXISTS user_contacts_block_direct_delete ON public.user_contacts;

CREATE POLICY user_contacts_block_direct_insert
ON public.user_contacts
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY user_contacts_block_direct_update
ON public.user_contacts
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY user_contacts_block_direct_delete
ON public.user_contacts
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY user_contacts_block_direct_insert ON public.user_contacts
IS 'Blocks direct authenticated contact inserts; use contact-manage for trusted server-side ingestion.';

COMMENT ON POLICY user_contacts_block_direct_update ON public.user_contacts
IS 'Blocks direct authenticated contact updates; use contact-manage for trusted server-side ingestion.';

COMMENT ON POLICY user_contacts_block_direct_delete ON public.user_contacts
IS 'Blocks direct authenticated contact deletes; use contact-manage for trusted server-side ingestion.';
