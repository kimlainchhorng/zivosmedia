-- Flight search logs table for debugging Duffel OTA searches
CREATE TABLE flight_search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Search parameters
  origin_iata TEXT NOT NULL,
  destination_iata TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  passengers INTEGER NOT NULL DEFAULT 1,
  cabin_class TEXT NOT NULL DEFAULT 'economy',
  
  -- Duffel response
  duffel_request_id TEXT,
  duffel_status_code INTEGER,
  duffel_error TEXT,
  offers_count INTEGER DEFAULT 0,
  
  -- Timing
  response_time_ms INTEGER,
  
  -- Environment
  environment TEXT DEFAULT 'sandbox',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient admin queries
CREATE INDEX idx_flight_search_logs_created ON flight_search_logs(created_at DESC);
CREATE INDEX idx_flight_search_logs_route ON flight_search_logs(origin_iata, destination_iata);
CREATE INDEX idx_flight_search_logs_errors ON flight_search_logs(duffel_error) WHERE duffel_error IS NOT NULL;

-- RLS: Admin-only access
ALTER TABLE flight_search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to flight logs"
ON flight_search_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Insert policy for edge function (service role bypasses RLS)
CREATE POLICY "Service role can insert logs"
ON flight_search_logs
FOR INSERT
TO service_role
WITH CHECK (true);