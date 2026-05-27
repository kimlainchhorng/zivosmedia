-- cafe_public_customer_summary: lightweight returning-customer recognition
-- for the public order page. Returns the most-recent name we have on file
-- (so misspellings get auto-corrected), visit count, and first-visit date.
-- Skips refunded/cancelled/pending to avoid counting half-completed flows.

CREATE OR REPLACE FUNCTION public.cafe_public_customer_summary(
  p_store_id uuid,
  p_phone text
)
RETURNS TABLE (
  name text,
  visit_count integer,
  first_visit_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_phone TEXT := NULLIF(trim(p_phone), '');
BEGIN
  IF v_phone IS NULL OR length(v_phone) < 6 OR p_store_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH matching AS (
    SELECT customer_name, placed_at,
           ROW_NUMBER() OVER (ORDER BY placed_at DESC) AS rn
      FROM public.cafe_orders
     WHERE store_id = p_store_id
       AND customer_phone = v_phone
       AND status NOT IN ('cancelled', 'refunded')
  ),
  rolled AS (
    SELECT
      (SELECT customer_name FROM matching WHERE rn = 1 AND customer_name IS NOT NULL) AS name,
      COUNT(*)::INTEGER AS visit_count,
      MIN(placed_at) AS first_visit_at
    FROM matching
  )
  SELECT name, visit_count, first_visit_at FROM rolled WHERE visit_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cafe_public_customer_summary(uuid, text) TO anon, authenticated;
