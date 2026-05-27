-- ============================================
-- ZIVO Notifications & Automation System (Fixed)
-- ============================================

-- Create notification channel enum
DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('email', 'in_app', 'sms');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create notification status enum
DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'failed', 'read');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create notification category enum
DO $$ BEGIN
  CREATE TYPE notification_category AS ENUM ('transactional', 'account', 'operational', 'marketing');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Main notifications table
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.travel_orders(id) ON DELETE SET NULL,
  
  -- Notification details
  channel notification_channel NOT NULL DEFAULT 'in_app',
  category notification_category NOT NULL DEFAULT 'transactional',
  template TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  
  -- Status tracking
  status notification_status NOT NULL DEFAULT 'queued',
  provider_message_id TEXT,
  error_message TEXT,
  
  -- Read tracking (for in_app)
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Notification templates table
-- ============================================
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category notification_category NOT NULL,
  
  -- Template content
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  
  -- Channels this template supports
  supports_email BOOLEAN DEFAULT true,
  supports_in_app BOOLEAN DEFAULT true,
  supports_sms BOOLEAN DEFAULT false,
  
  -- Control flags
  is_active BOOLEAN DEFAULT true,
  can_be_disabled BOOLEAN DEFAULT false,
  
  -- Metadata
  variables JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- User notification preferences
-- ============================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  email_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  marketing_enabled BOOLEAN DEFAULT true,
  operational_enabled BOOLEAN DEFAULT true,
  phone_number TEXT,
  phone_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_order_id ON public.notifications(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON public.notifications(channel);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON public.notification_templates(template_key);

-- ============================================
-- Enable RLS
-- ============================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for notifications
-- ============================================
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'operations', 'support')
    )
  );

CREATE POLICY "Admins can update any notification"
  ON public.notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'operations', 'support')
    )
  );

-- ============================================
-- RLS Policies for templates
-- ============================================
CREATE POLICY "Anyone can view active templates"
  ON public.notification_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.notification_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================
-- RLS Policies for preferences
-- ============================================
CREATE POLICY "Users can view own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

CREATE TRIGGER notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_updated_at();

-- ============================================
-- Insert default notification templates
-- ============================================
INSERT INTO public.notification_templates (template_key, name, category, subject, body_html, body_text, can_be_disabled) VALUES
('booking_confirmation', 'Booking Confirmation', 'transactional', 
 'Your ZIVO Booking is Confirmed - {{order_number}}',
 '<h1>Booking Confirmed!</h1><p>Thank you for booking with ZIVO. Your order <strong>{{order_number}}</strong> has been confirmed.</p><p><a href="{{order_url}}">View your booking</a></p>',
 'Booking Confirmed! Thank you for booking with ZIVO. Your order {{order_number}} has been confirmed.',
 false),

('booking_pending', 'Booking Pending', 'transactional',
 'Your ZIVO Booking is Being Processed - {{order_number}}',
 '<h1>Booking Received</h1><p>We are processing your booking <strong>{{order_number}}</strong>. You will receive a confirmation shortly.</p>',
 'Booking Received. We are processing your booking {{order_number}}. You will receive a confirmation shortly.',
 false),

('payment_success', 'Payment Success', 'transactional',
 'Payment Received - {{order_number}}',
 '<h1>Payment Successful</h1><p>We have received your payment of <strong>{{amount}}</strong> for order {{order_number}}.</p>',
 'Payment Successful. We have received your payment of {{amount}} for order {{order_number}}.',
 false),

('payment_failed', 'Payment Failed', 'transactional',
 'Payment Failed - Action Required',
 '<h1>Payment Failed</h1><p>We could not process your payment for order {{order_number}}. Please try again or use a different payment method.</p><p><a href="{{retry_url}}">Retry Payment</a></p>',
 'Payment Failed. We could not process your payment for order {{order_number}}. Please try again.',
 false),

('cancellation_requested', 'Cancellation Requested', 'transactional',
 'Cancellation Request Received - {{order_number}}',
 '<h1>Cancellation Request Received</h1><p>We have received your cancellation request for order {{order_number}}. Our team will review it within 24-48 hours.</p>',
 'Cancellation Request Received. We have received your request for order {{order_number}}.',
 false),

('cancellation_approved', 'Cancellation Approved', 'transactional',
 'Cancellation Approved - {{order_number}}',
 '<h1>Cancellation Approved</h1><p>Your cancellation for order {{order_number}} has been approved. A refund of {{refund_amount}} will be processed within 5-10 business days.</p>',
 'Cancellation Approved. Your order {{order_number}} has been cancelled. Refund: {{refund_amount}}.',
 false),

('cancellation_rejected', 'Cancellation Rejected', 'transactional',
 'Cancellation Update - {{order_number}}',
 '<h1>Cancellation Request Update</h1><p>We are unable to process your cancellation for order {{order_number}}. Reason: {{reason}}</p><p>Please contact support for assistance.</p>',
 'Cancellation Update. We could not process your cancellation for order {{order_number}}. Please contact support.',
 false),

('refund_processed', 'Refund Processed', 'transactional',
 'Refund Processed - {{order_number}}',
 '<h1>Refund Processed</h1><p>Your refund of <strong>{{refund_amount}}</strong> for order {{order_number}} has been processed. It may take 5-10 business days to appear in your account.</p>',
 'Refund Processed. Your refund of {{refund_amount}} for order {{order_number}} has been processed.',
 false),

('welcome', 'Welcome Email', 'account',
 'Welcome to ZIVO!',
 '<h1>Welcome to ZIVO!</h1><p>We are excited to have you. Start exploring amazing travel deals today.</p><p><a href="{{explore_url}}">Start Exploring</a></p>',
 'Welcome to ZIVO! Start exploring amazing travel deals today.',
 false),

('password_reset', 'Password Reset', 'account',
 'Reset Your Password',
 '<h1>Password Reset</h1><p>Click the link below to reset your password:</p><p><a href="{{reset_url}}">Reset Password</a></p><p>This link expires in 1 hour.</p>',
 'Reset your password by visiting: {{reset_url}}. This link expires in 1 hour.',
 false),

('support_reply', 'Support Reply', 'operational',
 'Update on Your Support Request - {{ticket_id}}',
 '<h1>Support Update</h1><p>Our team has responded to your support request:</p><p><em>{{message}}</em></p><p><a href="{{ticket_url}}">View Full Thread</a></p>',
 'Support Update for ticket {{ticket_id}}: {{message}}',
 true)

ON CONFLICT (template_key) DO NOTHING;