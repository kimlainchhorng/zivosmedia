-- cafe_public_review_summary: trust-badge data for the public order page.
-- Returns avg rating + count of visible reviews. Anon-callable.

CREATE OR REPLACE FUNCTION public.cafe_public_review_summary(p_store_id uuid)
RETURNS TABLE (avg_rating numeric, review_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ROUND(AVG(r.rating_stars)::numeric, 1) AS avg_rating,
    COUNT(*)::integer AS review_count
  FROM public.cafe_reviews r
  WHERE r.store_id = p_store_id
    AND r.is_visible = true
    AND r.rating_stars IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.cafe_public_review_summary(uuid) TO anon, authenticated;
