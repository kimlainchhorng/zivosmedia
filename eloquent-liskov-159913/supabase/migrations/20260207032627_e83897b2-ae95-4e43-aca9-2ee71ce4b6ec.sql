-- =====================================================
-- ZIVO Anti-Fraud System - Database Schema
-- =====================================================

-- 1. Create risk_events table for consolidated abuse/risk events
CREATE TABLE public.risk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  severity int NOT NULL DEFAULT 1 CHECK (severity >= 1 AND severity <= 5),
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  device_fingerprint text,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for common queries
CREATE INDEX idx_risk_events_user_id ON public.risk_events(user_id);
CREATE INDEX idx_risk_events_driver_id ON public.risk_events(driver_id);
CREATE INDEX idx_risk_events_event_type ON public.risk_events(event_type);
CREATE INDEX idx_risk_events_created_at ON public.risk_events(created_at DESC);
CREATE INDEX idx_risk_events_severity ON public.risk_events(severity);

-- 2. Create user_limits table for customer rate limiting
CREATE TABLE public.user_limits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  orders_created_today int DEFAULT 0,
  cancels_today int DEFAULT 0,
  last_reset date DEFAULT current_date,
  is_blocked boolean DEFAULT false,
  blocked_until timestamptz,
  block_reason text,
  total_blocks int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Create driver_limits table for driver rate limiting
CREATE TABLE public.driver_limits (
  driver_id uuid PRIMARY KEY REFERENCES public.drivers(id) ON DELETE CASCADE,
  cancels_today int DEFAULT 0,
  gps_flags_today int DEFAULT 0,
  last_reset date DEFAULT current_date,
  is_blocked boolean DEFAULT false,
  blocked_until timestamptz,
  block_reason text,
  total_blocks int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Alter driver_location_history for GPS spoof detection
ALTER TABLE public.driver_location_history
ADD COLUMN IF NOT EXISTS prev_lat double precision,
ADD COLUMN IF NOT EXISTS prev_lng double precision,
ADD COLUMN IF NOT EXISTS prev_recorded_at timestamptz,
ADD COLUMN IF NOT EXISTS is_suspicious boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS speed_mph double precision,
ADD COLUMN IF NOT EXISTS distance_jump_miles double precision;

-- Create index for suspicious locations
CREATE INDEX IF NOT EXISTS idx_driver_location_history_suspicious 
ON public.driver_location_history(driver_id, is_suspicious) 
WHERE is_suspicious = true;

-- 5. Enable RLS on new tables
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_limits ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for risk_events (admin only SELECT)
CREATE POLICY "admin_select_risk_events"
ON public.risk_events FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_update_risk_events"
ON public.risk_events FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Service role can insert (edge functions use service role)
-- No direct insert policy needed as edge functions bypass RLS with service role

-- 7. RLS Policies for user_limits (no direct access, edge function controlled)
-- Users can read their own limits
CREATE POLICY "users_select_own_limits"
ON public.user_limits FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all
CREATE POLICY "admin_select_user_limits"
ON public.user_limits FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_update_user_limits"
ON public.user_limits FOR UPDATE
USING (public.is_admin(auth.uid()));

-- 8. RLS Policies for driver_limits (no direct access, edge function controlled)
-- Drivers can read their own limits
CREATE POLICY "drivers_select_own_limits"
ON public.driver_limits FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.drivers d
    WHERE d.id = driver_limits.driver_id
    AND d.user_id = auth.uid()
  )
);

-- Admins can view all
CREATE POLICY "admin_select_driver_limits"
ON public.driver_limits FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_update_driver_limits"
ON public.driver_limits FOR UPDATE
USING (public.is_admin(auth.uid()));

-- 9. Create auto-suspend trigger function for GPS spoof detection
CREATE OR REPLACE FUNCTION public.check_gps_spoof_threshold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_flags INTEGER;
BEGIN
  -- Only check for gps_suspicious events
  IF NEW.event_type = 'gps_suspicious' AND NEW.driver_id IS NOT NULL THEN
    -- Count recent GPS suspicious events in last hour
    SELECT COUNT(*) INTO recent_flags
    FROM public.risk_events
    WHERE driver_id = NEW.driver_id
      AND event_type = 'gps_suspicious'
      AND created_at > NOW() - INTERVAL '1 hour';
    
    -- If 5+ flags in an hour, auto-suspend
    IF recent_flags >= 5 THEN
      -- Suspend the driver
      UPDATE public.drivers 
      SET is_suspended = true, updated_at = now()
      WHERE id = NEW.driver_id;
      
      -- Update or insert driver limits
      INSERT INTO public.driver_limits (driver_id, is_blocked, blocked_until, block_reason, total_blocks)
      VALUES (NEW.driver_id, true, NOW() + INTERVAL '24 hours', 'GPS spoof auto-suspend', 1)
      ON CONFLICT (driver_id) DO UPDATE SET
        is_blocked = true,
        blocked_until = NOW() + INTERVAL '24 hours',
        block_reason = 'GPS spoof auto-suspend',
        total_blocks = driver_limits.total_blocks + 1,
        updated_at = now();
      
      -- Log the auto-suspension as a separate event
      INSERT INTO public.risk_events (driver_id, event_type, severity, details)
      VALUES (
        NEW.driver_id, 
        'auto_suspended', 
        5, 
        jsonb_build_object('reason', 'gps_spoof_repeat', 'flag_count', recent_flags)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on risk_events
DROP TRIGGER IF EXISTS trigger_check_gps_spoof ON public.risk_events;
CREATE TRIGGER trigger_check_gps_spoof
AFTER INSERT ON public.risk_events
FOR EACH ROW
EXECUTE FUNCTION public.check_gps_spoof_threshold();

-- 10. Add comment documentation
COMMENT ON TABLE public.risk_events IS 'Consolidated abuse and risk events for anti-fraud monitoring';
COMMENT ON TABLE public.user_limits IS 'Customer rate limits for orders and cancellations';
COMMENT ON TABLE public.driver_limits IS 'Driver rate limits for cancels and GPS suspicious activity';
COMMENT ON COLUMN public.risk_events.severity IS '1=low, 2=medium, 3=high, 4=critical, 5=emergency';
COMMENT ON COLUMN public.driver_location_history.is_suspicious IS 'Flagged by GPS spoof detection (impossible speed/jumps)';