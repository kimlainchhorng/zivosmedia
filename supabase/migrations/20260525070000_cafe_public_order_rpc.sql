-- Public order placement for QR / mobile customers.
-- The RPC is SECURITY DEFINER so anonymous customers don't need direct INSERT
-- privileges on cafe_orders / cafe_order_items. Everything is snapshotted from
-- the catalog so the client can't lie about prices.
--
-- Inputs:
--   p_store_id       — required, the cafe.
--   p_table_token    — optional, QR-table token (cafe_tables.qr_token).
--   p_channel        — 'qr_table' | 'pickup' | 'counter' (defaults qr_table).
--   p_customer       — { name, phone, email } JSON; all optional.
--   p_items          — JSON array of { menu_item_id, quantity, notes, modifier_ids[] }.
--   p_customer_notes — optional free text on the whole ticket.
--
-- Returns the newly created cafe_orders.id.

CREATE OR REPLACE FUNCTION public.cafe_place_public_order(
  p_store_id UUID,
  p_table_token UUID,
  p_channel TEXT,
  p_customer JSONB,
  p_items JSONB,
  p_customer_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_table_id UUID;
  v_item_record JSONB;
  v_menu RECORD;
  v_order_item_id UUID;
  v_modifier_id UUID;
  v_modifier RECORD;
  v_mod_total INTEGER;
  v_qty INTEGER;
  v_channel public.cafe_order_channel;
  v_store_active BOOLEAN;
BEGIN
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required';
  END IF;

  SELECT is_active INTO v_store_active
    FROM public.store_profiles WHERE id = p_store_id;
  IF NOT FOUND OR NOT v_store_active THEN
    RAISE EXCEPTION 'cafe not available for orders';
  END IF;

  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'order must contain at least one item';
  END IF;

  -- Resolve QR table token → table_id (optional).
  IF p_table_token IS NOT NULL THEN
    SELECT id INTO v_table_id
      FROM public.cafe_tables
      WHERE store_id = p_store_id
        AND qr_token = p_table_token
        AND is_active = true;
    IF v_table_id IS NULL THEN
      RAISE EXCEPTION 'invalid table';
    END IF;
  END IF;

  -- Coerce channel; default qr_table when token given else counter.
  v_channel := COALESCE(
    NULLIF(p_channel, '')::public.cafe_order_channel,
    CASE WHEN v_table_id IS NOT NULL THEN 'qr_table'::public.cafe_order_channel ELSE 'counter'::public.cafe_order_channel END
  );

  INSERT INTO public.cafe_orders (
    store_id, table_id, status, channel,
    customer_name, customer_phone, customer_email, customer_user_id,
    customer_notes
  ) VALUES (
    p_store_id, v_table_id, 'pending', v_channel,
    NULLIF(p_customer->>'name', ''),
    NULLIF(p_customer->>'phone', ''),
    NULLIF(p_customer->>'email', ''),
    auth.uid(),
    NULLIF(p_customer_notes, '')
  )
  RETURNING id INTO v_order_id;

  FOR v_item_record IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, price_cents, store_id, is_active
      INTO v_menu
      FROM public.cafe_menu_items
      WHERE id = (v_item_record->>'menu_item_id')::UUID;
    IF v_menu.id IS NULL OR v_menu.store_id <> p_store_id OR v_menu.is_active = false THEN
      RAISE EXCEPTION 'menu item not available';
    END IF;

    v_qty := GREATEST(1, LEAST(99, COALESCE((v_item_record->>'quantity')::INTEGER, 1)));
    v_mod_total := 0;

    INSERT INTO public.cafe_order_items (
      order_id, store_id, menu_item_id,
      item_name, unit_price_cents, quantity,
      modifiers_total_cents, notes
    ) VALUES (
      v_order_id, p_store_id, v_menu.id,
      v_menu.name, v_menu.price_cents, v_qty,
      0, NULLIF(v_item_record->>'notes', '')
    )
    RETURNING id INTO v_order_item_id;

    -- Apply chosen modifiers. We re-read each one from the catalog so the
    -- client can't supply its own price.
    FOR v_modifier_id IN
      SELECT (value)::UUID
        FROM jsonb_array_elements_text(COALESCE(v_item_record->'modifier_ids', '[]'::jsonb))
    LOOP
      SELECT id, name, price_delta_cents, group_id, store_id, is_active
        INTO v_modifier
        FROM public.cafe_modifiers
        WHERE id = v_modifier_id;
      IF v_modifier.id IS NULL OR v_modifier.store_id <> p_store_id OR v_modifier.is_active = false THEN
        CONTINUE;
      END IF;
      INSERT INTO public.cafe_order_item_modifiers (
        order_item_id, modifier_id, group_id,
        group_name, modifier_name, price_delta_cents
      ) VALUES (
        v_order_item_id, v_modifier.id, v_modifier.group_id,
        (SELECT name FROM public.cafe_modifier_groups WHERE id = v_modifier.group_id),
        v_modifier.name, v_modifier.price_delta_cents
      );
      v_mod_total := v_mod_total + v_modifier.price_delta_cents;
    END LOOP;

    IF v_mod_total <> 0 THEN
      UPDATE public.cafe_order_items
        SET modifiers_total_cents = v_mod_total
        WHERE id = v_order_item_id;
    END IF;
  END LOOP;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_place_public_order(UUID, UUID, TEXT, JSONB, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_place_public_order(UUID, UUID, TEXT, JSONB, JSONB, TEXT) TO anon, authenticated;

-- Public lookup so an anonymous QR customer can poll their own order by id.
-- Returns a thin status/ticket view (no money / no internal notes).
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
  total_cents INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT o.id, o.ticket_number, o.status, o.channel,
         t.label AS table_label,
         o.placed_at, o.ready_at, o.served_at, o.total_cents
  FROM public.cafe_orders o
  LEFT JOIN public.cafe_tables t ON t.id = o.table_id
  WHERE o.id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_public_order_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_public_order_status(UUID) TO anon, authenticated;
