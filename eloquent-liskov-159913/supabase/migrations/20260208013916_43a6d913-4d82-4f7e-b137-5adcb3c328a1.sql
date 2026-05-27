-- Add pricing breakdown and commission columns to ride_requests
ALTER TABLE ride_requests 
  ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS driver_earning NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ride_type_multiplier NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS quoted_base_fare NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quoted_distance_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quoted_time_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quoted_booking_fee NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS quoted_surge_multiplier NUMERIC(4,2);

COMMENT ON COLUMN ride_requests.commission_amount IS 'Platform commission = price_total * commission_percent';
COMMENT ON COLUMN ride_requests.driver_earning IS 'Driver payout = price_total - commission_amount';
COMMENT ON COLUMN ride_requests.ride_type_multiplier IS 'Multiplier based on vehicle type (standard=1.0, xl=1.3, etc.)';
COMMENT ON COLUMN ride_requests.quoted_base_fare IS 'Base fare at time of booking';
COMMENT ON COLUMN ride_requests.quoted_distance_fee IS 'Distance fee at time of booking';
COMMENT ON COLUMN ride_requests.quoted_time_fee IS 'Time fee at time of booking';
COMMENT ON COLUMN ride_requests.quoted_booking_fee IS 'Booking fee at time of booking';
COMMENT ON COLUMN ride_requests.quoted_surge_multiplier IS 'Surge multiplier at time of booking';