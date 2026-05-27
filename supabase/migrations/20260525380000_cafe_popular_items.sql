-- Returns the most-ordered menu items for a store over a rolling window.
-- Public-readable (no auth gate) so the anonymous customer-facing menu
-- page can show "🔥 Popular" badges without exposing anything sensitive —
-- just menu_item_id + total qty in the window.

CREATE OR REPLACE FUNCTION public.cafe_popular_items(
  p_store_id uuid,
  p_window_days integer DEFAULT 7,
  p_limit integer DEFAULT 3
)
RETURNS TABLE (menu_item_id uuid, qty integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT i.menu_item_id, SUM(i.quantity)::INTEGER AS qty
    FROM public.cafe_order_items i
    JOIN public.cafe_orders o ON o.id = i.order_id
   WHERE o.store_id = p_store_id
     AND o.status = 'completed'
     AND o.placed_at >= now() - make_interval(days => GREATEST(p_window_days, 1))
     AND i.menu_item_id IS NOT NULL
   GROUP BY i.menu_item_id
   ORDER BY qty DESC
   LIMIT GREATEST(p_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.cafe_popular_items(uuid, integer, integer) TO anon, authenticated;
