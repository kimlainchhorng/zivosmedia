-- =============================================
-- 1. Extend promo_codes table for ride requirements
-- =============================================
ALTER TABLE public.promo_codes 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS min_fare NUMERIC,
ADD COLUMN IF NOT EXISTS max_discount NUMERIC,
ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER;

COMMENT ON COLUMN public.promo_codes.city IS 'Restrict promo to specific pickup city (NULL = all cities)';
COMMENT ON COLUMN public.promo_codes.start_at IS 'Start date for validity window';
COMMENT ON COLUMN public.promo_codes.min_fare IS 'Minimum fare required to apply promo';
COMMENT ON COLUMN public.promo_codes.max_discount IS 'Cap on discount amount (for percent type)';
COMMENT ON COLUMN public.promo_codes.max_uses_per_user IS 'Per-user usage limit';

-- =============================================
-- 2. Extend ride_requests table for promo tracking
-- =============================================
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS price_before_discount NUMERIC,
ADD COLUMN IF NOT EXISTS promo_code TEXT,
ADD COLUMN IF NOT EXISTS promo_id UUID REFERENCES public.promo_codes(id),
ADD COLUMN IF NOT EXISTS promo_discount NUMERIC;

COMMENT ON COLUMN public.ride_requests.price_before_discount IS 'Original quoted fare before promo';
COMMENT ON COLUMN public.ride_requests.promo_code IS 'Applied promo code text';
COMMENT ON COLUMN public.ride_requests.promo_id IS 'Reference to promo_codes.id';
COMMENT ON COLUMN public.ride_requests.promo_discount IS 'Discount amount applied';

-- =============================================
-- 3. Create validate_ride_promo RPC function
-- =============================================
CREATE OR REPLACE FUNCTION public.validate_ride_promo(
  p_code TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_pickup_city TEXT DEFAULT NULL,
  p_fare_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promo RECORD;
  v_total_uses INTEGER;
  v_user_uses INTEGER;
  v_discount_amount NUMERIC;
  v_final_total NUMERIC;
BEGIN
  -- 1. Fetch promo by code (active + valid date range)
  SELECT * INTO v_promo
  FROM public.promo_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (start_at IS NULL OR start_at <= NOW());

  IF v_promo.id IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Invalid or expired promo code'
    );
  END IF;

  -- 2. Check city restriction
  IF v_promo.city IS NOT NULL AND p_pickup_city IS NOT NULL THEN
    IF UPPER(v_promo.city) != UPPER(p_pickup_city) THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'This promo code is not valid in your pickup city'
      );
    END IF;
  END IF;

  -- 3. Check minimum fare requirement
  IF v_promo.min_fare IS NOT NULL AND p_fare_amount < v_promo.min_fare THEN
    RETURN jsonb_build_object(
      'valid', false,
      'error', 'Order total must be at least $' || v_promo.min_fare::TEXT || ' to use this code'
    );
  END IF;

  -- 4. Check total uses limit
  IF v_promo.max_uses IS NOT NULL THEN
    SELECT COUNT(*) INTO v_total_uses
    FROM public.promo_redemptions
    WHERE promo_id = v_promo.id;
    
    IF v_total_uses >= v_promo.max_uses THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'This promo code has reached its usage limit'
      );
    END IF;
  END IF;

  -- 5. Check per-user uses limit
  IF v_promo.max_uses_per_user IS NOT NULL AND p_user_id IS NOT NULL AND p_user_id != '' THEN
    SELECT COUNT(*) INTO v_user_uses
    FROM public.promo_redemptions
    WHERE promo_id = v_promo.id
      AND user_id = p_user_id::UUID;
    
    IF v_user_uses >= v_promo.max_uses_per_user THEN
      RETURN jsonb_build_object(
        'valid', false,
        'error', 'You have already used this promo code the maximum number of times'
      );
    END IF;
  END IF;

  -- 6. Calculate discount
  IF v_promo.discount_type = 'percent' THEN
    v_discount_amount := p_fare_amount * (v_promo.discount_value / 100);
    -- Apply max_discount cap if set
    IF v_promo.max_discount IS NOT NULL AND v_discount_amount > v_promo.max_discount THEN
      v_discount_amount := v_promo.max_discount;
    END IF;
  ELSE
    -- Fixed/flat discount
    v_discount_amount := v_promo.discount_value;
  END IF;

  -- Ensure discount doesn't exceed fare
  IF v_discount_amount > p_fare_amount THEN
    v_discount_amount := p_fare_amount;
  END IF;

  v_final_total := GREATEST(0, p_fare_amount - v_discount_amount);

  -- 7. Return success with promo details
  RETURN jsonb_build_object(
    'valid', true,
    'promo_id', v_promo.id,
    'code', v_promo.code,
    'discount_type', v_promo.discount_type,
    'discount_value', v_promo.discount_value,
    'discount_amount', ROUND(v_discount_amount::NUMERIC, 2),
    'final_total', ROUND(v_final_total::NUMERIC, 2),
    'description', CASE 
      WHEN v_promo.discount_type = 'percent' THEN v_promo.discount_value || '% off your ride'
      ELSE '$' || v_promo.discount_value || ' off your ride'
    END
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_ride_promo TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_ride_promo TO anon;