-- cafe_public_last_order_items: returns the lines + modifier ids from the
-- customer's most recent non-cancelled order, so the public order page can
-- offer a one-tap "Reorder same as last time" button. Public-readable —
-- anyone who knows a phone can see what that phone ordered last, but the
-- output is just the line items (no totals, no customer details).

CREATE OR REPLACE FUNCTION public.cafe_public_last_order_items(
  p_store_id uuid,
  p_phone text
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
DECLARE
  v_phone TEXT := NULLIF(trim(p_phone), '');
  v_order_id UUID;
BEGIN
  IF v_phone IS NULL OR length(v_phone) < 6 OR p_store_id IS NULL THEN
    RETURN;
  END IF;

  -- Find the most recent non-cancelled/refunded order for this phone+store.
  SELECT o.id INTO v_order_id
    FROM public.cafe_orders o
   WHERE o.store_id = p_store_id
     AND o.customer_phone = v_phone
     AND o.status NOT IN ('cancelled', 'refunded')
   ORDER BY o.placed_at DESC
   LIMIT 1;

  IF v_order_id IS NULL THEN
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
  WHERE i.order_id = v_order_id
    AND i.menu_item_id IS NOT NULL
  ORDER BY i.created_at NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cafe_public_last_order_items(uuid, text) TO anon, authenticated;
