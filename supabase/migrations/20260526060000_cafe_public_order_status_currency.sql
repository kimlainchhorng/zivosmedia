-- Phase 67: extend the status RPC to also return the store's currency_code
-- so the tracker page can render totals in the right currency.

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
  est_minutes INTEGER,
  store_slug TEXT,
  currency_code TEXT
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
    ), 0) AS est_minutes,
    sp.slug AS store_slug,
    COALESCE(cs.currency_code, 'USD') AS currency_code
  FROM public.cafe_orders o
  LEFT JOIN public.cafe_tables t ON t.id = o.table_id
  LEFT JOIN public.store_profiles sp ON sp.id = o.store_id
  LEFT JOIN public.cafe_settings cs ON cs.store_id = o.store_id
  WHERE o.id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_public_order_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_public_order_status(UUID) TO anon, authenticated;
