DROP FUNCTION IF EXISTS public.get_trending_near_user(uuid, integer);

CREATE FUNCTION public.get_trending_near_user(p_user_id uuid, p_limit integer DEFAULT 8)
RETURNS TABLE(store_id uuid, store_name text, category text, logo_url text, relevance_score numeric, is_featured boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id AS store_id,
    sp.name AS store_name,
    sp.category,
    sp.logo_url,
    COALESCE(uit.score, 0) + (CASE WHEN public.is_store_featured(sp.id) THEN 50 ELSE 0 END) AS relevance_score,
    public.is_store_featured(sp.id) AS is_featured
  FROM store_profiles sp
  LEFT JOIN user_interest_tags uit ON uit.user_id = p_user_id AND uit.category = sp.category
  WHERE sp.is_active = true
  ORDER BY
    public.is_store_featured(sp.id) DESC,
    COALESCE(uit.score, 0) DESC,
    sp.created_at DESC
  LIMIT p_limit;
END;
$$;