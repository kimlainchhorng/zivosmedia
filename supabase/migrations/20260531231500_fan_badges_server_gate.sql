-- Fan badges are earned status/proof rows. Direct client inserts let any
-- authenticated user mint arbitrary badges for any creator/fan pair, so badge
-- awarding must come from trusted server-side jobs or payment/community flows.

DROP POLICY IF EXISTS "fb_ins" ON public.fan_badges;

COMMENT ON TABLE public.fan_badges
IS 'Fan badge rows are awarded by trusted server flows only; clients read badges via RLS.';
