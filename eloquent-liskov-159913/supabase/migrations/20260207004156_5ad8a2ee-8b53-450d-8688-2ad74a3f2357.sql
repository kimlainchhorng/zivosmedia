-- Add ride_type column to trips table for ride classification
ALTER TABLE trips ADD COLUMN IF NOT EXISTS ride_type TEXT;

-- Add index for faster queries on requested trips
CREATE INDEX IF NOT EXISTS idx_trips_status_requested ON trips(status) WHERE status = 'requested';

-- Add index for driver's active trips
CREATE INDEX IF NOT EXISTS idx_trips_driver_active ON trips(driver_id, status) WHERE status IN ('accepted', 'en_route', 'arrived', 'in_progress');