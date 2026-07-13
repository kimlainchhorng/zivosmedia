-- Force authenticated browser writes to push_subscriptions through push Edge
-- Functions so user_id attribution and endpoint validation stay server-owned.

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_block_direct_insert ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_block_direct_update ON public.push_subscriptions;
DROP POLICY IF EXISTS push_subscriptions_block_direct_delete ON public.push_subscriptions;

CREATE POLICY push_subscriptions_block_direct_insert
ON public.push_subscriptions
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY push_subscriptions_block_direct_update
ON public.push_subscriptions
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY push_subscriptions_block_direct_delete
ON public.push_subscriptions
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY push_subscriptions_block_direct_insert ON public.push_subscriptions
IS 'Blocks direct authenticated push subscription inserts; use register-web-push for trusted server-side ingestion.';

COMMENT ON POLICY push_subscriptions_block_direct_update ON public.push_subscriptions
IS 'Blocks direct authenticated push subscription updates; use push Edge Functions for trusted server-side ingestion.';

COMMENT ON POLICY push_subscriptions_block_direct_delete ON public.push_subscriptions
IS 'Blocks direct authenticated push subscription deletes; use unregister-web-push or push-device-manage for trusted server-side ingestion.';
