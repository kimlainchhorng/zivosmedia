-- Force chat thread preference writes through chat-thread-settings-update so
-- user_id attribution and patch validation are owned by trusted server code.

ALTER TABLE public.chat_thread_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_thread_settings_block_direct_insert ON public.chat_thread_settings;
DROP POLICY IF EXISTS chat_thread_settings_block_direct_update ON public.chat_thread_settings;
DROP POLICY IF EXISTS chat_thread_settings_block_direct_delete ON public.chat_thread_settings;

CREATE POLICY chat_thread_settings_block_direct_insert
ON public.chat_thread_settings
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY chat_thread_settings_block_direct_update
ON public.chat_thread_settings
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY chat_thread_settings_block_direct_delete
ON public.chat_thread_settings
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY chat_thread_settings_block_direct_insert ON public.chat_thread_settings
IS 'Blocks direct authenticated chat thread setting inserts; use chat-thread-settings-update for trusted server-side ingestion.';

COMMENT ON POLICY chat_thread_settings_block_direct_update ON public.chat_thread_settings
IS 'Blocks direct authenticated chat thread setting updates; use chat-thread-settings-update for trusted server-side ingestion.';

COMMENT ON POLICY chat_thread_settings_block_direct_delete ON public.chat_thread_settings
IS 'Blocks direct authenticated chat thread setting deletes; use chat-thread-settings-update for trusted server-side ingestion.';
