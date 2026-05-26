-- Email Logs table for tracking all sent emails
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resend_id TEXT,
  error_message TEXT,
  search_session_id TEXT,
  booking_ref TEXT,
  partner_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Consent table for tracking user consent
CREATE TABLE public.email_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  search_session_id TEXT,
  consent_type TEXT NOT NULL DEFAULT 'trip_updates',
  consented_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  consent_text TEXT,
  is_active BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email Settings table for admin configuration
CREATE TABLE public.email_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abandoned Search Tracking table
CREATE TABLE public.abandoned_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_session_id TEXT NOT NULL,
  email TEXT NOT NULL,
  search_type TEXT NOT NULL,
  search_params JSONB NOT NULL DEFAULT '{}'::jsonb,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checkout_initiated BOOLEAN DEFAULT false,
  checkout_initiated_at TIMESTAMP WITH TIME ZONE,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abandoned_searches ENABLE ROW LEVEL SECURITY;

-- Email logs - admin only read/write
CREATE POLICY "Admin can manage email logs"
ON public.email_logs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Email consents - anyone can insert their own consent
CREATE POLICY "Anyone can give consent"
ON public.email_consents
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view consents"
ON public.email_consents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Email settings - admin only
CREATE POLICY "Admins can manage email settings"
ON public.email_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Abandoned searches - admin only
CREATE POLICY "Admins can manage abandoned searches"
ON public.abandoned_searches
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Indexes for performance
CREATE INDEX idx_email_logs_email_type ON public.email_logs(email_type);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at);
CREATE INDEX idx_email_logs_search_session ON public.email_logs(search_session_id);

CREATE INDEX idx_email_consents_email ON public.email_consents(email);
CREATE INDEX idx_email_consents_session ON public.email_consents(search_session_id);

CREATE INDEX idx_abandoned_searches_session ON public.abandoned_searches(search_session_id);
CREATE INDEX idx_abandoned_searches_email ON public.abandoned_searches(email);
CREATE INDEX idx_abandoned_searches_searched_at ON public.abandoned_searches(searched_at);

-- Insert default email settings
INSERT INTO public.email_settings (setting_key, setting_value, description) VALUES
  ('abandoned_search', '{"enabled": true, "delay_minutes": 45, "from_name": "Hizovo Travel", "reply_to": "support@hizovo.com"}', 'Abandoned search email settings'),
  ('redirect_confirmation', '{"enabled": true, "from_name": "Hizovo Travel", "reply_to": "support@hizovo.com"}', 'Checkout redirect confirmation email settings'),
  ('booking_status', '{"enabled": true, "from_name": "Hizovo Travel", "reply_to": "support@hizovo.com"}', 'Booking status email settings'),
  ('support_auto_reply', '{"enabled": true, "from_name": "Hizovo Support", "reply_to": "support@hizovo.com", "response_window_hours": 24}', 'Support auto-reply settings');

-- Update trigger for email_logs
CREATE TRIGGER update_email_logs_updated_at
BEFORE UPDATE ON public.email_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for email_settings
CREATE TRIGGER update_email_settings_updated_at
BEFORE UPDATE ON public.email_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add missing columns to support_tickets if they don't exist
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS ticket_number TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS auto_reply_sent BOOLEAN DEFAULT false;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS search_session_id TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS booking_ref TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS partner_name TEXT;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'HZ-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number (only if not exists)
DROP TRIGGER IF EXISTS generate_support_ticket_number ON public.support_tickets;
CREATE TRIGGER generate_support_ticket_number
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.generate_ticket_number();