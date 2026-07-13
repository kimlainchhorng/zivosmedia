-- Creator tips are financial records. Tip rows and status changes are created
-- by payment Edge Functions and provider webhooks after checkout/order
-- creation, not by direct browser inserts.

DROP POLICY IF EXISTS "ct_ins" ON public.creator_tips;

COMMENT ON TABLE public.creator_tips
IS 'Creator tip rows are written by trusted payment functions and webhooks only; clients may read tip rows scoped by RLS.';
