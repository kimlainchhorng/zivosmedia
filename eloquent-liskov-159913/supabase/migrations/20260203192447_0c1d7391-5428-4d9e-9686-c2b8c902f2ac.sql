-- Create analytics events table for tracking user behavior
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  page TEXT,
  order_id UUID,
  value NUMERIC,
  meta JSONB DEFAULT '{}',
  device_type TEXT,
  country TEXT,
  traffic_source TEXT,
  is_new_user BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for fast querying
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);

-- Create funnel definitions table
CREATE TABLE public.analytics_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  product_type TEXT NOT NULL, -- hotel, activity, transfer, flight
  steps JSONB NOT NULL, -- array of event names in order
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create performance metrics table
CREATE TABLE public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- api_latency, search_time, checkout_time, error_rate
  service TEXT, -- hotelbeds, stripe, duffel
  value_ms NUMERIC,
  success BOOLEAN DEFAULT true,
  error_code TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_performance_metrics_created ON public.performance_metrics(created_at DESC);
CREATE INDEX idx_performance_metrics_type ON public.performance_metrics(metric_type);

-- Create analytics aggregations table for pre-computed stats
CREATE TABLE public.analytics_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  product_type TEXT,
  dimension_key TEXT, -- country, device, traffic_source
  dimension_value TEXT,
  count_value INTEGER DEFAULT 0,
  sum_value NUMERIC DEFAULT 0,
  avg_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, metric_name, product_type, dimension_key, dimension_value)
);

CREATE INDEX idx_analytics_agg_date ON public.analytics_aggregations(date DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_aggregations ENABLE ROW LEVEL SECURITY;

-- RLS policies - analytics events can be inserted by anyone (for tracking)
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Only admins can view analytics
CREATE POLICY "Admins can view analytics events"
  ON public.analytics_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Funnel definitions - admins only
CREATE POLICY "Admins can manage funnels"
  ON public.analytics_funnels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Performance metrics - insert by system, read by admins
CREATE POLICY "System can insert performance metrics"
  ON public.performance_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view performance metrics"
  ON public.performance_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Aggregations - admins only
CREATE POLICY "Admins can view aggregations"
  ON public.analytics_aggregations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'super_admin')
    )
  );

-- Insert default funnel definitions
INSERT INTO public.analytics_funnels (name, description, product_type, steps) VALUES
('Hotel Booking Funnel', 'Track hotel search to booking conversion', 'hotel', 
 '["search_hotels", "view_results", "view_hotel", "checkout_started", "payment_succeeded", "booking_confirmed"]'),
('Activity Booking Funnel', 'Track activity search to booking conversion', 'activity',
 '["search_activities", "view_activity", "checkout_started", "payment_succeeded", "booking_confirmed"]'),
('Transfer Booking Funnel', 'Track transfer search to booking conversion', 'transfer',
 '["search_transfers", "checkout_started", "payment_succeeded", "booking_confirmed"]'),
('Flight Booking Funnel', 'Track flight search to booking conversion', 'flight',
 '["search_flights", "view_results", "view_flight", "checkout_started", "payment_succeeded", "booking_confirmed"]');