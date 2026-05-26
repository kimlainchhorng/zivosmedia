-- Phase 71: per-line void/comp with reason. Owner removes an item from an
-- in-flight order (wrong drink, customer complaint, spill). Audit trail
-- preserves who did it, why, and what was on the line — the cafe_order_items
-- row gets deleted afterwards so the existing recompute trigger updates
-- the order subtotal/total.
--
-- kind:
--   'void' — line removed, was never made (no cost to cafe)
--   'comp' — line was made + given for free (cafe ate the cost)
-- The distinction matters for accounting + COGS but not for the customer's
-- charged total — both reduce subtotal the same way.

CREATE TYPE public.cafe_void_kind AS ENUM ('void', 'comp');

CREATE TABLE IF NOT EXISTS public.cafe_order_item_voids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.cafe_orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  item_snapshot JSONB NOT NULL,
  kind public.cafe_void_kind NOT NULL,
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  voided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_order_item_voids_order_idx
  ON public.cafe_order_item_voids(order_id, voided_at DESC);
CREATE INDEX IF NOT EXISTS cafe_order_item_voids_store_idx
  ON public.cafe_order_item_voids(store_id, voided_at DESC);

ALTER TABLE public.cafe_order_item_voids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cafe_order_item_voids_owner_read ON public.cafe_order_item_voids;
CREATE POLICY cafe_order_item_voids_owner_read ON public.cafe_order_item_voids
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.store_profiles s
    WHERE s.id = cafe_order_item_voids.store_id AND s.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS cafe_order_item_voids_no_direct_insert ON public.cafe_order_item_voids;
CREATE POLICY cafe_order_item_voids_no_direct_insert ON public.cafe_order_item_voids
  FOR INSERT WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.cafe_void_order_item(
  p_order_item_id UUID,
  p_kind public.cafe_void_kind,
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_store_owner UUID;
  v_caller UUID := auth.uid();
  v_void_id UUID;
  v_modifiers JSONB;
BEGIN
  IF p_order_item_id IS NULL THEN RAISE EXCEPTION 'order_item_id required'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'reason required';
  END IF;

  SELECT oi.*
    INTO v_item
    FROM public.cafe_order_items oi
   WHERE oi.id = p_order_item_id;
  IF v_item.id IS NULL THEN RAISE EXCEPTION 'order item not found'; END IF;

  SELECT owner_id INTO v_store_owner
    FROM public.store_profiles
    WHERE id = v_item.store_id;
  IF v_store_owner IS NULL OR v_store_owner <> v_caller THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'group_name', m.group_name,
    'modifier_name', m.modifier_name,
    'price_delta_cents', m.price_delta_cents
  )), '[]'::jsonb)
    INTO v_modifiers
    FROM public.cafe_order_item_modifiers m
    WHERE m.order_item_id = p_order_item_id;

  INSERT INTO public.cafe_order_item_voids (
    order_id, store_id, item_snapshot, kind, reason, voided_by
  ) VALUES (
    v_item.order_id,
    v_item.store_id,
    jsonb_build_object(
      'item_id', v_item.id,
      'menu_item_id', v_item.menu_item_id,
      'item_name', v_item.item_name,
      'unit_price_cents', v_item.unit_price_cents,
      'quantity', v_item.quantity,
      'modifiers_total_cents', v_item.modifiers_total_cents,
      'line_total_cents', v_item.line_total_cents,
      'notes', v_item.notes,
      'modifiers', v_modifiers
    ),
    p_kind,
    trim(p_reason),
    v_caller
  ) RETURNING id INTO v_void_id;

  DELETE FROM public.cafe_order_items WHERE id = p_order_item_id;

  RETURN v_void_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_void_order_item(UUID, public.cafe_void_kind, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_void_order_item(UUID, public.cafe_void_kind, TEXT) TO authenticated;
