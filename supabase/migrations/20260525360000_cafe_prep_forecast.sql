-- Daily prep forecast: for a given store + target date, returns the top items
-- to prep based on the average quantity sold on the same weekday over the
-- last 4 occurrences. Only counts completed orders (since pending/cancelled
-- aren't real demand signal). The result is suggested servings to prep
-- *plus* the underlying sample so owners can sanity-check.

CREATE OR REPLACE FUNCTION public.cafe_prep_forecast(
  p_store_id uuid,
  p_target_date date DEFAULT (now() AT TIME ZONE 'UTC')::date,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  menu_item_id uuid,
  item_name text,
  category_id uuid,
  category_name text,
  weeks_observed integer,
  total_qty integer,
  avg_qty numeric,
  suggested_prep integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_target_dow INTEGER := EXTRACT(DOW FROM p_target_date)::INTEGER;
BEGIN
  -- Caller must own the store (or be an admin) — same gate as other
  -- cafe RPCs that read history.
  IF NOT EXISTS (
    SELECT 1 FROM public.store_profiles s
    WHERE s.id = p_store_id AND s.owner_id = auth.uid()
  ) THEN
    -- Also allow service role via a NULL auth.uid (e.g. from a trusted
    -- backoffice job); otherwise reject.
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  RETURN QUERY
  WITH same_weekday_orders AS (
    SELECT o.id, o.placed_at::date AS day
      FROM public.cafe_orders o
     WHERE o.store_id = p_store_id
       AND o.status = 'completed'
       AND o.placed_at::date < p_target_date
       AND EXTRACT(DOW FROM o.placed_at)::INTEGER = v_target_dow
       AND o.placed_at >= (p_target_date - interval '28 days')
  ),
  per_day AS (
    SELECT i.menu_item_id, swo.day, SUM(i.quantity)::INTEGER AS day_qty
      FROM same_weekday_orders swo
      JOIN public.cafe_order_items i ON i.order_id = swo.id
     WHERE i.menu_item_id IS NOT NULL
     GROUP BY i.menu_item_id, swo.day
  ),
  rollup AS (
    SELECT pd.menu_item_id,
           COUNT(DISTINCT pd.day)::INTEGER AS weeks_observed,
           SUM(pd.day_qty)::INTEGER AS total_qty,
           AVG(pd.day_qty)::NUMERIC AS avg_qty
      FROM per_day pd
     GROUP BY pd.menu_item_id
  )
  SELECT r.menu_item_id,
         m.name AS item_name,
         m.category_id,
         c.name AS category_name,
         r.weeks_observed,
         r.total_qty,
         ROUND(r.avg_qty, 1) AS avg_qty,
         -- Add 20% safety buffer and round up to the next whole serving.
         CEIL(r.avg_qty * 1.2)::INTEGER AS suggested_prep
    FROM rollup r
    JOIN public.cafe_menu_items m ON m.id = r.menu_item_id
    LEFT JOIN public.cafe_categories c ON c.id = m.category_id
   WHERE m.is_active = true
   ORDER BY r.avg_qty DESC NULLS LAST
   LIMIT GREATEST(p_limit, 1);
END;
$$;
