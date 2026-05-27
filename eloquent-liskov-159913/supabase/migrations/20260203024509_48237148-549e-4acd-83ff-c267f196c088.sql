-- Add incident fields to flights_launch_settings
ALTER TABLE public.flights_launch_settings 
ADD COLUMN IF NOT EXISTS incident_reason_code TEXT,
ADD COLUMN IF NOT EXISTS incident_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS incident_notes TEXT;

-- Create flight_incident_logs table for incident history
CREATE TABLE public.flight_incident_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL, -- 'manual_pause' | 'auto_pause' | 'failure_spike' | 'api_outage'
  reason_code TEXT NOT NULL,
  description TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Metrics at time of incident
  affected_bookings_count INTEGER DEFAULT 0,
  affected_booking_ids JSONB DEFAULT '[]',
  failure_count_trigger INTEGER, -- For auto-pause incidents
  
  -- Notifications sent
  customers_notified INTEGER DEFAULT 0,
  customers_resolved INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: Admin only
ALTER TABLE public.flight_incident_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read incident logs"
ON public.flight_incident_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert incident logs"
ON public.flight_incident_logs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update incident logs"
ON public.flight_incident_logs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can also manage incident logs (for edge functions)
CREATE POLICY "Service role can manage incident logs"
ON public.flight_incident_logs FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create index for quick lookup of active incidents
CREATE INDEX idx_flight_incident_logs_active ON public.flight_incident_logs (resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_flight_incident_logs_started ON public.flight_incident_logs (started_at DESC);