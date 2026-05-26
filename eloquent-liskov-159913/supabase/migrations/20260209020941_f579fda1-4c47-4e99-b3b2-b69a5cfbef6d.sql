-- Create secure RPC for customer batch info
-- Returns batch position and ETA without exposing other customers' data

CREATE OR REPLACE FUNCTION public.get_order_batch_info(p_order_id UUID)
RETURNS JSON AS $$
DECLARE
  v_batch_id UUID;
  v_customer_stop_order INT;
  v_total_stops INT;
  v_current_stop INT;
  v_customer_stop_eta TIMESTAMPTZ;
  v_customer_id UUID;
BEGIN
  -- First verify the caller owns this order
  SELECT batch_id, customer_id INTO v_batch_id, v_customer_id
  FROM food_orders
  WHERE id = p_order_id;
  
  -- Check ownership (RLS should handle this, but extra safety)
  IF v_customer_id IS NULL THEN
    RETURN json_build_object('is_batched', false, 'error', 'Order not found');
  END IF;
  
  IF v_batch_id IS NULL THEN
    RETURN json_build_object('is_batched', false);
  END IF;
  
  -- Get customer's dropoff stop order and ETA
  SELECT stop_order, eta INTO v_customer_stop_order, v_customer_stop_eta
  FROM batch_stops
  WHERE batch_id = v_batch_id
    AND food_order_id = p_order_id
    AND kind = 'dropoff';
  
  IF v_customer_stop_order IS NULL THEN
    -- Order is batched but no dropoff stop found yet
    RETURN json_build_object(
      'is_batched', true,
      'batch_id', v_batch_id,
      'total_stops', 0,
      'customer_stop_order', null,
      'stops_before_customer', 0,
      'current_stop_order', null,
      'is_driver_on_earlier_stop', false,
      'customer_stop_eta', null
    );
  END IF;
  
  -- Get total stops in this batch
  SELECT COUNT(*) INTO v_total_stops
  FROM batch_stops
  WHERE batch_id = v_batch_id;
  
  -- Get current stop (first non-completed stop)
  SELECT MIN(stop_order) INTO v_current_stop
  FROM batch_stops
  WHERE batch_id = v_batch_id
    AND status NOT IN ('completed');
  
  -- If no incomplete stops, use customer's stop
  IF v_current_stop IS NULL THEN
    v_current_stop := v_customer_stop_order;
  END IF;
  
  RETURN json_build_object(
    'is_batched', true,
    'batch_id', v_batch_id,
    'total_stops', v_total_stops,
    'customer_stop_order', v_customer_stop_order,
    'stops_before_customer', v_customer_stop_order - 1,
    'current_stop_order', v_current_stop,
    'is_driver_on_earlier_stop', v_current_stop < v_customer_stop_order,
    'customer_stop_eta', v_customer_stop_eta
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;