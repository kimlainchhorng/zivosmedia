-- Operations Checklists
CREATE TABLE public.operations_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_type TEXT NOT NULL CHECK (checklist_type IN ('daily', 'weekly', 'monthly')),
  checklist_date DATE NOT NULL,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  items JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(checklist_type, checklist_date)
);

-- Incident Logs
CREATE TABLE public.incident_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'payment_booking_failed', 'provider_outage', 'fraud_spike', 
    'email_failure', 'api_error', 'security_breach', 'other'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mitigating', 'resolved', 'closed')),
  title TEXT NOT NULL,
  description TEXT,
  affected_bookings INTEGER DEFAULT 0,
  affected_users INTEGER DEFAULT 0,
  root_cause TEXT,
  resolution TEXT,
  prevention_steps TEXT,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Base Articles
CREATE TABLE public.knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'booking_issues', 'cancellation_rules', 'refund_timing', 
    'provider_errors', 'escalation_contacts', 'customer_communication',
    'fraud_handling', 'payment_issues', 'general'
  )),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  is_published BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team Role Definitions (documentation, not auth)
CREATE TABLE public.team_role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  description TEXT,
  responsibilities JSONB DEFAULT '[]',
  escalation_path TEXT,
  sla_targets JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default role definitions
INSERT INTO public.team_role_definitions (role_name, description, responsibilities, escalation_path, sla_targets) VALUES
  ('operations', 'Monitor bookings and handle supplier issues', 
   '["Monitor bookings", "Handle supplier issues", "Confirm pending bookings", "Escalate failures", "Check provider API status"]',
   'Escalate to Admin for critical issues',
   '{"booking_confirmation_hours": 2, "supplier_response_hours": 4}'
  ),
  ('support', 'Respond to customer tickets and follow SLAs',
   '["Respond to tickets", "Follow SLAs", "Communicate with customers", "Update ticket status", "Route to correct team"]',
   'Escalate to Operations for booking issues, Finance for refunds',
   '{"first_response_hours": 24, "resolution_hours": 72}'
  ),
  ('finance', 'Handle refunds and reconcile payments',
   '["Handle refunds", "Reconcile Stripe payments", "Track revenue & commissions", "Approve high-value refunds", "Review chargebacks"]',
   'Escalate to Admin for exceptions over $500',
   '{"refund_processing_hours": 48, "reconciliation_frequency": "daily"}'
  ),
  ('admin', 'Oversee operations and manage exceptions',
   '["Oversee risk", "Review fraud flags", "Approve exceptions", "Manage partners", "Strategic decisions"]',
   'Final escalation point',
   '{}'
  );

-- Default checklist templates
CREATE TABLE public.checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_type TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.checklist_templates (checklist_type, items) VALUES
  ('daily', '[
    {"id": "failed_bookings", "label": "Check failed bookings", "category": "operations"},
    {"id": "pending_confirmations", "label": "Check pending confirmations", "category": "operations"},
    {"id": "fraud_dashboard", "label": "Review fraud dashboard", "category": "security"},
    {"id": "urgent_tickets", "label": "Review urgent tickets", "category": "support"},
    {"id": "payment_failures", "label": "Check payment failures", "category": "finance"},
    {"id": "provider_status", "label": "Check provider API status", "category": "operations"}
  ]'),
  ('weekly', '[
    {"id": "sla_performance", "label": "Review SLA performance", "category": "support"},
    {"id": "refund_rate", "label": "Review refund rate", "category": "finance"},
    {"id": "fraud_blocks", "label": "Review fraud blocks", "category": "security"},
    {"id": "supplier_issues", "label": "Review supplier issues", "category": "operations"},
    {"id": "revenue_vs_refunds", "label": "Check revenue vs refunds", "category": "finance"},
    {"id": "customer_complaints", "label": "Review customer complaints", "category": "support"}
  ]');

-- Indexes
CREATE INDEX idx_ops_checklists_date ON public.operations_checklists(checklist_date DESC);
CREATE INDEX idx_ops_checklists_type ON public.operations_checklists(checklist_type);
CREATE INDEX idx_incident_logs_status ON public.incident_logs(status);
CREATE INDEX idx_incident_logs_severity ON public.incident_logs(severity);
CREATE INDEX idx_incident_logs_created ON public.incident_logs(created_at DESC);
CREATE INDEX idx_kb_articles_category ON public.knowledge_base_articles(category);
CREATE INDEX idx_kb_articles_slug ON public.knowledge_base_articles(slug);

-- RLS
ALTER TABLE public.operations_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_role_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

-- Policies - Admin/Moderator access
CREATE POLICY "Staff can view checklists" ON public.operations_checklists
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can manage checklists" ON public.operations_checklists
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can view incidents" ON public.incident_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can manage incidents" ON public.incident_logs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Staff can view KB articles" ON public.knowledge_base_articles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can manage KB articles" ON public.knowledge_base_articles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view role definitions" ON public.team_role_definitions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can manage role definitions" ON public.team_role_definitions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Staff can view templates" ON public.checklist_templates
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));