-- Extend cafe_place_public_order with optional gift card application.
-- After the order's lines + tip + promo are settled, if a gift card code
-- is supplied we validate it, insert a cafe_gift_card_redemptions row
-- (which debits the balance via the existing trigger) and a
-- cafe_payments row with method='gift_card' (which updates paid_cents
-- via its trigger). The amount applied is capped at the order's total.
--
-- We drop and re-create because adding params to a SECURITY DEFINER
-- function with a different signature isn't compatible with
-- CREATE OR REPLACE.

DROP FUNCTION IF EXISTS public.cafe_place_public_order(UUID, UUID, TEXT, JSONB, JSONB, TEXT, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION public.cafe_place_public_order(
  p_store_id UUID,
  p_table_token UUID,
  p_channel TEXT,
  p_customer JSONB,
  p_items JSONB,
  p_customer_notes TEXT,
  p_tip_cents INTEGER DEFAULT 0,
  p_promo_code TEXT DEFAULT NULL,
  p_gift_card_code TEXT DEFAULT NULL
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
  v_subtotal INTEGER;
  v_promo RECORD;
  v_discount INTEGER := 0;
  v_now TIMESTAMPTZ := now();
  v_weekday INTEGER;
  v_hour INTEGER;
  v_tip_safe INTEGER;
  v_gift_card RECORD;
  v_order_total INTEGER;
  v_gift_apply INTEGER;
BEGIN
  IF p_store_id IS NULL THEN
    RAISE EXCEPTION 'store_id is required';
  END IF;
  SELECT is_active INTO v_store_active FROM public.store_profiles WHERE id = p_store_id;
  IF NOT FOUND OR NOT v_store_active THEN
    RAISE EXCEPTION 'cafe not available for orders';
  END IF;
  IF jsonb_array_length(COALESCE(p_items, '[]'::jsonb)) = 0 THEN
    RAISE EXCEPTION 'order must contain at least one item';
  END IF;

  IF p_table_token IS NOT NULL THEN
    SELECT id INTO v_table_id FROM public.cafe_tables
      WHERE store_id = p_store_id AND qr_token = p_table_token AND is_active = true;
    IF v_table_id IS NULL THEN RAISE EXCEPTION 'invalid table'; END IF;
  END IF;
  v_channel := COALESCE(NULLIF(p_channel, '')::public.cafe_order_channel,
    CASE WHEN v_table_id IS NOT NULL THEN 'qr_table'::public.cafe_order_channel ELSE 'counter'::public.cafe_order_channel END);

  v_tip_safe := GREATEST(COALESCE(p_tip_cents, 0), 0);

  INSERT INTO public.cafe_orders (store_id, table_id, status, channel,
    customer_name, customer_phone, customer_email, customer_user_id,
    customer_notes, tip_cents)
  VALUES (p_store_id, v_table_id, 'pending', v_channel,
    NULLIF(p_customer->>'name', ''), NULLIF(p_customer->>'phone', ''), NULLIF(p_customer->>'email', ''),
    auth.uid(), NULLIF(p_customer_notes, ''), v_tip_safe)
  RETURNING id INTO v_order_id;

  FOR v_item_record IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT id, name, price_cents, store_id, is_active INTO v_menu
      FROM public.cafe_menu_items WHERE id = (v_item_record->>'menu_item_id')::UUID;
    IF v_menu.id IS NULL OR v_menu.store_id <> p_store_id OR v_menu.is_active = false THEN
      RAISE EXCEPTION 'menu item not available';
    END IF;
    v_qty := GREATEST(1, LEAST(99, COALESCE((v_item_record->>'quantity')::INTEGER, 1)));
    v_mod_total := 0;
    INSERT INTO public.cafe_order_items (order_id, store_id, menu_item_id,
      item_name, unit_price_cents, quantity, modifiers_total_cents, notes)
    VALUES (v_order_id, p_store_id, v_menu.id, v_menu.name, v_menu.price_cents, v_qty,
      0, NULLIF(v_item_record->>'notes', ''))
    RETURNING id INTO v_order_item_id;

    FOR v_modifier_id IN
      SELECT (value)::UUID FROM jsonb_array_elements_text(COALESCE(v_item_record->'modifier_ids', '[]'::jsonb))
    LOOP
      SELECT id, name, price_delta_cents, group_id, store_id, is_active INTO v_modifier
        FROM public.cafe_modifiers WHERE id = v_modifier_id;
      IF v_modifier.id IS NULL OR v_modifier.store_id <> p_store_id OR v_modifier.is_active = false THEN
        CONTINUE;
      END IF;
      INSERT INTO public.cafe_order_item_modifiers (order_item_id, modifier_id, group_id,
        group_name, modifier_name, price_delta_cents)
      VALUES (v_order_item_id, v_modifier.id, v_modifier.group_id,
        (SELECT name FROM public.cafe_modifier_groups WHERE id = v_modifier.group_id),
        v_modifier.name, v_modifier.price_delta_cents);
      v_mod_total := v_mod_total + v_modifier.price_delta_cents;
    END LOOP;

    IF v_mod_total <> 0 THEN
      UPDATE public.cafe_order_items SET modifiers_total_cents = v_mod_total WHERE id = v_order_item_id;
    END IF;
  END LOOP;

  SELECT subtotal_cents INTO v_subtotal FROM public.cafe_orders WHERE id = v_order_id;

  -- Promo (same logic as before).
  IF p_promo_code IS NOT NULL AND length(trim(p_promo_code)) > 0 THEN
    SELECT * INTO v_promo FROM public.cafe_promotions
      WHERE store_id = p_store_id AND is_active = true AND upper(code) = upper(trim(p_promo_code)) LIMIT 1;
    IF v_promo.id IS NULL THEN RAISE EXCEPTION 'promo code invalid'; END IF;
    IF v_promo.start_at IS NOT NULL AND v_now < v_promo.start_at THEN RAISE EXCEPTION 'promo not yet active'; END IF;
    IF v_promo.end_at IS NOT NULL AND v_now >= v_promo.end_at THEN RAISE EXCEPTION 'promo expired'; END IF;
    IF v_promo.max_redemptions IS NOT NULL AND v_promo.redemption_count >= v_promo.max_redemptions THEN RAISE EXCEPTION 'promo fully redeemed'; END IF;
    IF v_promo.min_subtotal_cents > 0 AND v_subtotal < v_promo.min_subtotal_cents THEN RAISE EXCEPTION 'order subtotal below promo minimum'; END IF;
    IF array_length(v_promo.weekdays, 1) IS NOT NULL THEN
      v_weekday := EXTRACT(DOW FROM v_now)::INTEGER;
      IF NOT (v_weekday = ANY(v_promo.weekdays)) THEN RAISE EXCEPTION 'promo not valid today'; END IF;
    END IF;
    IF v_promo.hour_start IS NOT NULL OR v_promo.hour_end IS NOT NULL THEN
      v_hour := EXTRACT(HOUR FROM v_now)::INTEGER;
      IF v_promo.hour_start IS NOT NULL AND v_hour < v_promo.hour_start THEN RAISE EXCEPTION 'promo not valid yet today'; END IF;
      IF v_promo.hour_end IS NOT NULL AND v_hour > v_promo.hour_end THEN RAISE EXCEPTION 'promo no longer valid today'; END IF;
    END IF;
    IF v_promo.kind = 'percent' THEN
      v_discount := LEAST(v_subtotal, FLOOR((v_subtotal * v_promo.amount)::NUMERIC / 100.0)::INTEGER);
    ELSE
      v_discount := LEAST(v_subtotal, v_promo.amount);
    END IF;
    UPDATE public.cafe_orders SET discount_cents = v_discount WHERE id = v_order_id;
    UPDATE public.cafe_promotions SET redemption_count = redemption_count + 1 WHERE id = v_promo.id;
  END IF;

  -- Gift card application. Validates and applies as a payment row + redemption.
  -- Capped at the order's current total so we never over-redeem.
  IF p_gift_card_code IS NOT NULL AND length(trim(p_gift_card_code)) > 0 THEN
    SELECT id, balance_cents, is_active, expires_at, store_id INTO v_gift_card
      FROM public.cafe_gift_cards
      WHERE store_id = p_store_id
        AND upper(code) = upper(trim(p_gift_card_code))
      LIMIT 1;
    IF v_gift_card.id IS NULL THEN
      RAISE EXCEPTION 'gift card invalid';
    END IF;
    IF v_gift_card.is_active = false THEN
      RAISE EXCEPTION 'gift card inactive';
    END IF;
    IF v_gift_card.expires_at IS NOT NULL AND v_gift_card.expires_at < v_now THEN
      RAISE EXCEPTION 'gift card expired';
    END IF;
    IF v_gift_card.balance_cents <= 0 THEN
      RAISE EXCEPTION 'gift card has no balance';
    END IF;

    SELECT total_cents INTO v_order_total FROM public.cafe_orders WHERE id = v_order_id;
    v_gift_apply := LEAST(v_gift_card.balance_cents, v_order_total);

    IF v_gift_apply > 0 THEN
      -- Debit the card (trigger updates balance + enforces non-negative).
      INSERT INTO public.cafe_gift_card_redemptions (
        gift_card_id, order_id, store_id, amount_cents, notes
      ) VALUES (
        v_gift_card.id, v_order_id, p_store_id, v_gift_apply,
        'Public checkout'
      );
      -- Credit a payment row (trigger syncs cafe_orders.paid_cents).
      INSERT INTO public.cafe_payments (
        order_id, store_id, method, status, amount_cents, reference
      ) VALUES (
        v_order_id, p_store_id, 'gift_card', 'captured', v_gift_apply,
        upper(trim(p_gift_card_code))
      );
    END IF;
  END IF;

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_place_public_order(UUID, UUID, TEXT, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_place_public_order(UUID, UUID, TEXT, JSONB, JSONB, TEXT, INTEGER, TEXT, TEXT) TO anon, authenticated;
