-- Extend cafe_public_order_status to return est_minutes — the sum of
-- (menu_item.prep_minutes × line.quantity) over the order's items, capped
-- at a reasonable upper bound. The tracker uses this to show "Est. ready
-- in ~N min" while the order is in flight.

DROP FUNCTION IF EXISTS public.cafe_public_order_status(UUID);

CREATE OR REPLACE FUNCTION public.cafe_public_order_status(p_order_id UUID)
RETURNS TABLE (
  id UUID,
  ticket_number INTEGER,
  status public.cafe_order_status,
  channel public.cafe_order_channel,
  table_label TEXT,
  placed_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  total_cents INTEGER,
  est_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.ticket_number,
    o.status,
    o.channel,
    t.label AS table_label,
    o.placed_at,
    o.ready_at,
    o.served_at,
    o.total_cents,
    COALESCE((
      SELECT LEAST(240, GREATEST(1,
        SUM(COALESCE(mi.prep_minutes, 5) * oi.quantity)
      ))::INTEGER
      FROM public.cafe_order_items oi
      LEFT JOIN public.cafe_menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = o.id
    ), 0) AS est_minutes
  FROM public.cafe_orders o
  LEFT JOIN public.cafe_tables t ON t.id = o.table_id
  WHERE o.id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_public_order_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_public_order_status(UUID) TO anon, authenticated;
