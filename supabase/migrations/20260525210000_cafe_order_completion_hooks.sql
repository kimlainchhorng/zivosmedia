-- Cafe order completion hooks. When an order transitions to 'completed':
--   • If the cafe has an active loyalty program AND the order has a phone
--     attached, earn points for the (post-discount) total.
--   • For each line item with a menu_item_id, look up the recipe and insert
--     a 'sold' movement that deducts ingredient stock.
--
-- Both side-effects are best-effort — failures (e.g. missing recipe) are
-- swallowed so we never block POS completion.

CREATE OR REPLACE FUNCTION public.tg_cafe_order_apply_completion_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program RECORD;
  v_balance_id UUID;
  v_points INTEGER;
  v_recipe RECORD;
  v_existing_loyalty_count INTEGER;
  v_existing_inv_count INTEGER;
BEGIN
  -- Fire only on the pending → completed transition.
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- === Loyalty earn ===
  -- Skip if order has no identifier we can use.
  IF NEW.customer_phone IS NOT NULL OR NEW.customer_user_id IS NOT NULL THEN
    SELECT * INTO v_program
      FROM public.cafe_loyalty_programs
      WHERE store_id = NEW.store_id
        AND is_active = true
      LIMIT 1;

    IF v_program.id IS NOT NULL THEN
      -- Don't double-earn if this order was already processed.
      SELECT COUNT(*) INTO v_existing_loyalty_count
        FROM public.cafe_loyalty_events
        WHERE order_id = NEW.id AND kind = 'earn';

      IF v_existing_loyalty_count = 0 THEN
        BEGIN
          -- Find or create the balance row.
          IF NEW.customer_user_id IS NOT NULL THEN
            SELECT id INTO v_balance_id
              FROM public.cafe_loyalty_balances
              WHERE store_id = NEW.store_id AND user_id = NEW.customer_user_id;
            IF v_balance_id IS NULL THEN
              INSERT INTO public.cafe_loyalty_balances (store_id, user_id, phone, display_name)
                VALUES (NEW.store_id, NEW.customer_user_id, NEW.customer_phone, NEW.customer_name)
                RETURNING id INTO v_balance_id;
            END IF;
          ELSIF NEW.customer_phone IS NOT NULL THEN
            SELECT id INTO v_balance_id
              FROM public.cafe_loyalty_balances
              WHERE store_id = NEW.store_id AND phone = NEW.customer_phone;
            IF v_balance_id IS NULL THEN
              INSERT INTO public.cafe_loyalty_balances (store_id, phone, display_name)
                VALUES (NEW.store_id, NEW.customer_phone, NEW.customer_name)
                RETURNING id INTO v_balance_id;
            END IF;
          END IF;

          IF v_balance_id IS NOT NULL THEN
            IF v_program.mode = 'stamp_card' THEN
              -- One stamp per qualifying purchase.
              v_points := 1;
            ELSE
              -- points_per_dollar: earn_rate_milli is points-per-dollar.
              -- subtotal − discount converts cents → dollars.
              v_points := FLOOR(
                v_program.earn_rate_milli * (GREATEST(NEW.subtotal_cents - NEW.discount_cents, 0)::NUMERIC / 100.0)
              )::INTEGER;
            END IF;

            IF v_points > 0 THEN
              INSERT INTO public.cafe_loyalty_events (
                store_id, balance_id, order_id, kind, points_change, notes
              ) VALUES (
                NEW.store_id, v_balance_id, NEW.id, 'earn', v_points,
                'Order #' || NEW.ticket_number
              );
            END IF;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          -- Best effort — never block order completion on loyalty errors.
          RAISE NOTICE 'loyalty earn failed for order %: %', NEW.id, SQLERRM;
        END;
      END IF;
    END IF;
  END IF;

  -- === Inventory auto-deduct ===
  -- Skip if we've already deducted for this order (idempotency).
  SELECT COUNT(*) INTO v_existing_inv_count
    FROM public.cafe_inventory_movements
    WHERE order_id = NEW.id AND reason = 'sold';

  IF v_existing_inv_count = 0 THEN
    BEGIN
      FOR v_recipe IN
        SELECT
          oi.id AS order_item_id,
          oi.menu_item_id,
          oi.quantity AS line_qty,
          r.inventory_item_id,
          r.quantity_per_serving,
          ii.unit
        FROM public.cafe_order_items oi
        JOIN public.cafe_recipes r ON r.menu_item_id = oi.menu_item_id
        JOIN public.cafe_inventory_items ii ON ii.id = r.inventory_item_id
        WHERE oi.order_id = NEW.id
          AND oi.menu_item_id IS NOT NULL
      LOOP
        INSERT INTO public.cafe_inventory_movements (
          store_id, inventory_item_id, reason, qty_change,
          order_id, reference, notes
        ) VALUES (
          NEW.store_id,
          v_recipe.inventory_item_id,
          'sold',
          -(v_recipe.quantity_per_serving * v_recipe.line_qty),
          NEW.id,
          'Order #' || NEW.ticket_number,
          NULL
        );
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'inventory auto-deduct failed for order %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_order_apply_completion_side_effects ON public.cafe_orders;
CREATE TRIGGER cafe_order_apply_completion_side_effects
  AFTER UPDATE OF status ON public.cafe_orders
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.tg_cafe_order_apply_completion_side_effects();

-- Public lookup for the receipt page. Returns enough to render a printable
-- receipt without exposing internal notes.
CREATE OR REPLACE FUNCTION public.cafe_public_order_receipt(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_store RECORD;
  v_table_label TEXT;
  v_items JSONB;
  v_payments JSONB;
BEGIN
  SELECT * INTO v_order FROM public.cafe_orders WHERE id = p_order_id;
  IF v_order.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, name, slug, logo_url, address, phone INTO v_store
    FROM public.store_profiles WHERE id = v_order.store_id;

  IF v_order.table_id IS NOT NULL THEN
    SELECT label INTO v_table_label FROM public.cafe_tables WHERE id = v_order.table_id;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'name', oi.item_name,
      'quantity', oi.quantity,
      'unit_price_cents', oi.unit_price_cents,
      'modifiers_total_cents', oi.modifiers_total_cents,
      'line_total_cents', oi.line_total_cents,
      'notes', oi.notes,
      'modifiers', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'group_name', m.group_name,
          'modifier_name', m.modifier_name,
          'price_delta_cents', m.price_delta_cents
        ) ORDER BY m.sort_order)
        FROM public.cafe_order_item_modifiers m
        WHERE m.order_item_id = oi.id
      ), '[]'::jsonb)
    ) ORDER BY oi.sort_order
  ), '[]'::jsonb)
  INTO v_items
  FROM public.cafe_order_items oi
  WHERE oi.order_id = v_order.id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'method', p.method,
      'status', p.status,
      'amount_cents', p.amount_cents,
      'tip_cents', p.tip_cents,
      'refunded_cents', p.refunded_cents,
      'reference', p.reference,
      'created_at', p.created_at
    ) ORDER BY p.created_at
  ), '[]'::jsonb)
  INTO v_payments
  FROM public.cafe_payments p
  WHERE p.order_id = v_order.id;

  RETURN jsonb_build_object(
    'store', jsonb_build_object(
      'id', v_store.id, 'name', v_store.name, 'slug', v_store.slug,
      'logo_url', v_store.logo_url, 'address', v_store.address, 'phone', v_store.phone
    ),
    'order', jsonb_build_object(
      'id', v_order.id,
      'ticket_number', v_order.ticket_number,
      'status', v_order.status,
      'channel', v_order.channel,
      'table_label', v_table_label,
      'customer_name', v_order.customer_name,
      'placed_at', v_order.placed_at,
      'completed_at', v_order.completed_at,
      'subtotal_cents', v_order.subtotal_cents,
      'discount_cents', v_order.discount_cents,
      'tax_cents', v_order.tax_cents,
      'tip_cents', v_order.tip_cents,
      'total_cents', v_order.total_cents,
      'paid_cents', v_order.paid_cents
    ),
    'items', v_items,
    'payments', v_payments
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_public_order_receipt(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_public_order_receipt(UUID) TO anon, authenticated;
