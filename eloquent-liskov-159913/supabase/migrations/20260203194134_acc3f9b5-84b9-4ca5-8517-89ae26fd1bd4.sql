-- Add SLA tracking columns to existing support_tickets table
ALTER TABLE public.support_tickets 
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.travel_orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_response_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_resolution_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_response_breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_resolution_breached BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_paused_duration_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create SLA Definitions table if not exists
CREATE TABLE IF NOT EXISTS public.sla_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT NOT NULL UNIQUE,
  response_time_hours INTEGER NOT NULL,
  resolution_time_hours INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default SLA definitions (on conflict do nothing)
INSERT INTO public.sla_definitions (priority, response_time_hours, resolution_time_hours, description) VALUES
  ('urgent', 1, 24, 'Payment charged but no booking - critical'),
  ('high', 4, 48, 'Booking pending or travel soon'),
  ('normal', 24, 72, 'Standard support request'),
  ('low', 48, NULL, 'General inquiries - no resolution target')
ON CONFLICT (priority) DO NOTHING;

-- Create Ticket Templates table if not exists
CREATE TABLE IF NOT EXISTS public.ticket_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default templates
INSERT INTO public.ticket_templates (name, category, subject, body) VALUES
  ('Acknowledge Receipt', NULL, NULL, 'Thank you for contacting ZIVO Support. We''ve received your request and our team is reviewing it. We''ll get back to you within the timeframe shown above.'),
  ('Reviewing Booking', 'booking_issue', NULL, 'We''re currently reviewing your booking details with our travel partners. We''ll update you as soon as we have more information.'),
  ('Supplier Pending', NULL, NULL, 'We''ve contacted the supplier regarding your request and are awaiting their response. We''ll update you as soon as we hear back.'),
  ('Cancellation Received', 'cancellation_refund', NULL, 'We''ve received your cancellation request and are processing it according to the booking terms. You''ll receive confirmation once complete.'),
  ('Refund Processed', 'cancellation_refund', NULL, 'Great news! Your refund has been processed. Please allow 5-10 business days for the funds to appear in your account, depending on your bank.')
ON CONFLICT DO NOTHING;

-- Create Ticket Escalations Log table
CREATE TABLE IF NOT EXISTS public.ticket_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  escalated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  escalation_target TEXT NOT NULL CHECK (escalation_target IN ('operations', 'finance', 'admin', 'supplier')),
  reason TEXT NOT NULL,
  notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Support Metrics table (daily aggregations)
CREATE TABLE IF NOT EXISTS public.support_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  tickets_created INTEGER DEFAULT 0,
  tickets_resolved INTEGER DEFAULT 0,
  avg_first_response_minutes NUMERIC,
  avg_resolution_minutes NUMERIC,
  sla_response_breach_count INTEGER DEFAULT 0,
  sla_resolution_breach_count INTEGER DEFAULT 0,
  tickets_by_category JSONB DEFAULT '{}',
  tickets_by_priority JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date)
);

-- Function to check and update SLA breaches
CREATE OR REPLACE FUNCTION public.check_sla_breaches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  breach_count INTEGER := 0;
BEGIN
  -- Check response SLA breaches
  UPDATE public.support_tickets
  SET sla_response_breached = true, updated_at = now()
  WHERE status IN ('open', 'pending', 'in_progress')
    AND first_response_at IS NULL
    AND sla_response_due_at < now()
    AND sla_response_breached = false
    AND sla_paused_at IS NULL;
  
  GET DIAGNOSTICS breach_count = ROW_COUNT;
  
  -- Check resolution SLA breaches
  UPDATE public.support_tickets
  SET sla_resolution_breached = true, updated_at = now()
  WHERE status IN ('open', 'pending', 'in_progress')
    AND resolved_at IS NULL
    AND sla_resolution_due_at < now()
    AND sla_resolution_breached = false
    AND sla_paused_at IS NULL;
  
  RETURN breach_count;
END;
$$;

-- Function to calculate SLA due times when priority changes
CREATE OR REPLACE FUNCTION public.update_ticket_sla_times()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sla_record RECORD;
BEGIN
  -- Only recalculate if priority changed or SLA times not set
  IF (TG_OP = 'INSERT') OR (OLD.priority IS DISTINCT FROM NEW.priority) THEN
    SELECT * INTO sla_record FROM public.sla_definitions WHERE priority = NEW.priority AND is_active = true;
    
    IF sla_record IS NOT NULL THEN
      -- Use created_at for new tickets, current time for priority changes
      IF TG_OP = 'INSERT' THEN
        NEW.sla_response_due_at := NEW.created_at + (sla_record.response_time_hours || ' hours')::INTERVAL;
        IF sla_record.resolution_time_hours IS NOT NULL THEN
          NEW.sla_resolution_due_at := NEW.created_at + (sla_record.resolution_time_hours || ' hours')::INTERVAL;
        END IF;
      ELSE
        NEW.sla_response_due_at := now() + (sla_record.response_time_hours || ' hours')::INTERVAL;
        IF sla_record.resolution_time_hours IS NOT NULL THEN
          NEW.sla_resolution_due_at := now() + (sla_record.resolution_time_hours || ' hours')::INTERVAL;
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for SLA time updates (drop if exists first)
DROP TRIGGER IF EXISTS trigger_update_ticket_sla ON public.support_tickets;
CREATE TRIGGER trigger_update_ticket_sla
BEFORE INSERT OR UPDATE OF priority ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION update_ticket_sla_times();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_order_id ON public.support_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_response ON public.support_tickets(sla_response_due_at) WHERE status NOT IN ('resolved', 'closed');
CREATE INDEX IF NOT EXISTS idx_ticket_escalations_ticket_id ON public.ticket_escalations(ticket_id);

-- Enable RLS on new tables
ALTER TABLE public.sla_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "SLA definitions readable by authenticated" ON public.sla_definitions;
DROP POLICY IF EXISTS "Admins can manage SLA definitions" ON public.sla_definitions;
DROP POLICY IF EXISTS "Templates readable by admins" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON public.ticket_templates;
DROP POLICY IF EXISTS "Admins can view escalations" ON public.ticket_escalations;
DROP POLICY IF EXISTS "Admins can manage escalations" ON public.ticket_escalations;
DROP POLICY IF EXISTS "Admins can view metrics" ON public.support_metrics;

-- SLA Definitions policies
CREATE POLICY "SLA definitions readable by authenticated" ON public.sla_definitions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage SLA definitions" ON public.sla_definitions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Templates policies
CREATE POLICY "Templates readable by admins" ON public.ticket_templates
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can manage templates" ON public.ticket_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Escalations policies
CREATE POLICY "Admins can view escalations" ON public.ticket_escalations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can manage escalations" ON public.ticket_escalations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Metrics policies
CREATE POLICY "Admins can view metrics" ON public.support_metrics
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));