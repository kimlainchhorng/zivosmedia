-- Admin alerts table for failed flight bookings
CREATE TABLE flight_admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES flight_bookings(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('ticketing_failed', 'refund_failed', 'api_error', 'payment_failed')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for unresolved alerts
CREATE INDEX idx_flight_admin_alerts_unresolved ON flight_admin_alerts(created_at DESC) WHERE resolved = FALSE;
CREATE INDEX idx_flight_admin_alerts_booking ON flight_admin_alerts(booking_id);

-- RLS: Admin-only access
ALTER TABLE flight_admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access to flight alerts"
ON flight_admin_alerts FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));