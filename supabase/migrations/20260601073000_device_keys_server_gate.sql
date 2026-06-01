-- Secret Chat device keys are published/reset through device-key-manage so
-- user_id is assigned server-side while authenticated partner-key reads remain
-- available for E2E key exchange.

ALTER TABLE public.device_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS device_keys_block_direct_insert ON public.device_keys;
DROP POLICY IF EXISTS "device_keys_block_direct_insert" ON public.device_keys;
CREATE POLICY "device_keys_block_direct_insert"
ON public.device_keys
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS device_keys_block_direct_update ON public.device_keys;
DROP POLICY IF EXISTS "device_keys_block_direct_update" ON public.device_keys;
CREATE POLICY "device_keys_block_direct_update"
ON public.device_keys
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS device_keys_block_direct_delete ON public.device_keys;
DROP POLICY IF EXISTS "device_keys_block_direct_delete" ON public.device_keys;
CREATE POLICY "device_keys_block_direct_delete"
ON public.device_keys
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON TABLE public.device_keys IS
  'Secret Chat public device keys; authenticated reads are allowed, writes require trusted server-side ingestion.';
