
DROP VIEW IF EXISTS public.ads_studio_creative_stats;

CREATE VIEW public.ads_studio_creative_stats
WITH (security_invoker = true) AS
SELECT
  c.id AS creative_id,
  c.store_id,
  c.goal,
  c.status,
  c.created_at,
  COALESCE(SUM(CASE WHEN e.event_type='impression' THEN 1 ELSE 0 END),0)::int AS impressions,
  COALESCE(SUM(CASE WHEN e.event_type='click' THEN 1 ELSE 0 END),0)::int AS clicks,
  COALESCE(SUM(CASE WHEN e.event_type='conversion' THEN 1 ELSE 0 END),0)::int AS conversions,
  COALESCE(SUM(e.revenue_cents),0)::int AS revenue_cents,
  COALESCE(SUM(g.cost_cents),0)::int AS spend_cents
FROM public.ads_studio_creatives c
LEFT JOIN public.ads_studio_events e ON e.creative_id = c.id
LEFT JOIN public.ads_studio_generations g ON g.creative_id = c.id
GROUP BY c.id;

GRANT SELECT ON public.ads_studio_creative_stats TO authenticated;
