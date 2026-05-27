-- Phase 65: tracker-driven "Order again". Given a specific order_id (which
-- the customer already has in their URL via /cafe/order/:id), return the
-- line items + modifier ids so the public order page can pre-fill the cart.
-- Same exposure profile as cafe_public_order_status (anyone with the order
-- id can see this). Bundle-expanded items are returned as their underlying
-- menu items — customer can re-add the bundle manually for the discount.

CREATE OR REPLACE FUNCTION public.cafe_public_order_items_for_reorder(
  p_order_id uuid
)
RETURNS TABLE (
  menu_item_id uuid,
  item_name text,
  quantity integer,
  modifier_ids uuid[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_order_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    i.menu_item_id,
    i.item_name,
    i.quantity,
    COALESCE(
      ARRAY(
        SELECT om.modifier_id
          FROM public.cafe_order_item_modifiers om
         WHERE om.order_item_id = i.id
         ORDER BY om.created_at NULLS LAST
      ),
      ARRAY[]::uuid[]
    ) AS modifier_ids
  FROM public.cafe_order_items i
  WHERE i.order_id = p_order_id
    AND i.menu_item_id IS NOT NULL
  ORDER BY i.created_at NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cafe_public_order_items_for_reorder(uuid) TO anon, authenticated;
