-- Privacy preference writes are routed through privacy-settings-update so
-- only allowlisted fields can be changed and user_id is assigned server-side.

ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS privacy_settings_block_direct_insert ON public.privacy_settings;
DROP POLICY IF EXISTS "privacy_settings_block_direct_insert" ON public.privacy_settings;
CREATE POLICY "privacy_settings_block_direct_insert"
ON public.privacy_settings
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS privacy_settings_block_direct_update ON public.privacy_settings;
DROP POLICY IF EXISTS "privacy_settings_block_direct_update" ON public.privacy_settings;
CREATE POLICY "privacy_settings_block_direct_update"
ON public.privacy_settings
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

COMMENT ON TABLE public.privacy_settings IS
  'User privacy preferences; client writes are blocked and trusted server-side ingestion is required.';
