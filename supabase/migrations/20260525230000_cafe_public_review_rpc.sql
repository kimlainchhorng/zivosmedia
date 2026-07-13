-- Public review submission. The cafe_reviews INSERT policy requires
-- user_id = auth.uid(), which blocks anonymous customers. This RPC runs
-- SECURITY DEFINER and validates the order to ensure a review is only
-- posted against a real, completed order at the right store.
--
-- One review per order: enforced by the unique index on (order_id) below
-- with WHERE order_id IS NOT NULL so manually-added reviews aren't
-- restricted.

CREATE UNIQUE INDEX IF NOT EXISTS cafe_reviews_one_per_order_unique
  ON public.cafe_reviews (order_id) WHERE order_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.cafe_submit_public_review(
  p_order_id UUID,
  p_rating INTEGER,
  p_comment TEXT,
  p_display_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_review_id UUID;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'order_id is required';
  END IF;
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'rating must be 1–5';
  END IF;
  IF p_display_name IS NULL OR length(trim(p_display_name)) = 0 THEN
    RAISE EXCEPTION 'name is required';
  END IF;

  SELECT id, store_id, status INTO v_order
    FROM public.cafe_orders
    WHERE id = p_order_id;
  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'order not found';
  END IF;
  IF v_order.status NOT IN ('completed', 'served', 'ready') THEN
    RAISE EXCEPTION 'order not ready for review yet';
  END IF;

  -- Idempotency: if a review already exists for this order, return its id.
  SELECT id INTO v_review_id FROM public.cafe_reviews WHERE order_id = p_order_id;
  IF v_review_id IS NOT NULL THEN
    UPDATE public.cafe_reviews
      SET rating_stars = p_rating,
          comment = NULLIF(trim(p_comment), ''),
          display_name = trim(p_display_name),
          updated_at = now()
      WHERE id = v_review_id;
    RETURN v_review_id;
  END IF;

  INSERT INTO public.cafe_reviews (
    store_id, order_id, user_id,
    display_name, rating_stars, comment, is_visible
  ) VALUES (
    v_order.store_id, p_order_id, auth.uid(),
    trim(p_display_name), p_rating,
    NULLIF(trim(p_comment), ''),
    true
  )
  RETURNING id INTO v_review_id;
  RETURN v_review_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_submit_public_review(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_submit_public_review(UUID, INTEGER, TEXT, TEXT) TO anon, authenticated;

-- Lightweight order-with-store lookup so the review page can show the
-- customer what they're reviewing without leaking sensitive bits.
CREATE OR REPLACE FUNCTION public.cafe_public_order_for_review(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_store RECORD;
  v_existing RECORD;
BEGIN
  SELECT id, store_id, status, customer_name, ticket_number, placed_at INTO v_order
    FROM public.cafe_orders
    WHERE id = p_order_id;
  IF v_order.id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id, name, slug, logo_url INTO v_store
    FROM public.store_profiles WHERE id = v_order.store_id;
  SELECT id, rating_stars, comment, display_name, owner_response
    INTO v_existing
    FROM public.cafe_reviews WHERE order_id = p_order_id;

  RETURN jsonb_build_object(
    'store', jsonb_build_object('id', v_store.id, 'name', v_store.name, 'slug', v_store.slug, 'logo_url', v_store.logo_url),
    'order', jsonb_build_object(
      'id', v_order.id,
      'ticket_number', v_order.ticket_number,
      'status', v_order.status,
      'customer_name', v_order.customer_name,
      'placed_at', v_order.placed_at
    ),
    'existing_review', CASE WHEN v_existing.id IS NOT NULL THEN
      jsonb_build_object(
        'id', v_existing.id,
        'rating_stars', v_existing.rating_stars,
        'comment', v_existing.comment,
        'display_name', v_existing.display_name,
        'owner_response', v_existing.owner_response
      )
    ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_public_order_for_review(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_public_order_for_review(UUID) TO anon, authenticated;
