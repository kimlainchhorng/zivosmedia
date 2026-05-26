DROP VIEW IF EXISTS public.ads_studio_winner_history;
CREATE VIEW public.ads_studio_winner_history
WITH (security_invoker = true) AS
SELECT
  v.id AS variant_id,
  v.creative_id,
  v.store_id,
  v.variant_label,
  v.headline,
  v.cta,
  v.image_url,
  v.is_winner,
  v.created_at AS variant_created_at,
  c.goal,
  c.auto_winner_at,
  c.auto_winner_picked
FROM public.ads_studio_variants v
JOIN public.ads_studio_creatives c ON c.id = v.creative_id
WHERE v.is_winner = true;

DROP POLICY IF EXISTS "System inserts daily spend" ON public.ads_studio_daily_spend;
DROP POLICY IF EXISTS "System updates daily spend" ON public.ads_studio_daily_spend;

CREATE POLICY "Admins insert daily spend"
ON public.ads_studio_daily_spend
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update daily spend"
ON public.ads_studio_daily_spend
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));