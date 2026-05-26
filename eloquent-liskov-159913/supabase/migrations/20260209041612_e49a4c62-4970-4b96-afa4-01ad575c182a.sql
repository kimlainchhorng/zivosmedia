-- Add multi-stop delivery columns to food_orders table
ALTER TABLE public.food_orders
ADD COLUMN IF NOT EXISTS delivery_stops JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_multi_stop BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS total_distance_miles NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS current_stop_index INTEGER DEFAULT 0;

-- Add index for multi-stop orders
CREATE INDEX IF NOT EXISTS idx_food_orders_multi_stop ON public.food_orders(is_multi_stop) WHERE is_multi_stop = true;

-- Add comment for documentation
COMMENT ON COLUMN public.food_orders.delivery_stops IS 'Array of delivery stops with structure: [{stop_order, address, lat, lng, instructions, label, status, delivered_at}]';
COMMENT ON COLUMN public.food_orders.is_multi_stop IS 'Flag indicating if order has multiple delivery stops';
COMMENT ON COLUMN public.food_orders.total_distance_miles IS 'Total calculated route distance in miles';
COMMENT ON COLUMN public.food_orders.current_stop_index IS 'Index of current stop being delivered (0-based)';