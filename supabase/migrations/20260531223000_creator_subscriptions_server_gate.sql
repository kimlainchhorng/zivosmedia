-- All creator subscription creation now goes through subscribe-to-tier,
-- confirm-tier-subscription, or payment webhooks. The browser should not be
-- able to mint active subscription rows directly, even for free tiers.

DROP POLICY IF EXISTS "cs_ins_free_tier_only" ON public.creator_subscriptions;
DROP POLICY IF EXISTS "cs_ins" ON public.creator_subscriptions;

COMMENT ON TABLE public.creator_subscriptions
IS 'Creator subscription rows are written by server/payment flows only; clients may read their own subscriber or creator rows via SELECT policies.';
