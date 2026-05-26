-- Add last_message_at column for sorting by recent activity
ALTER TABLE support_tickets 
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();

-- Add submitter_role column to identify submitter type
ALTER TABLE support_tickets 
  ADD COLUMN IF NOT EXISTS submitter_role TEXT DEFAULT 'customer';

-- Create index for efficient inbox queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_last_message 
  ON support_tickets(status, last_message_at DESC);

-- Create index for ticket_replies by ticket
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_created 
  ON ticket_replies(ticket_id, created_at);

-- Trigger to update last_message_at when a reply is added
CREATE OR REPLACE FUNCTION update_ticket_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_tickets 
  SET 
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_ticket_last_message ON ticket_replies;

CREATE TRIGGER trigger_update_ticket_last_message
  AFTER INSERT ON ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_last_message();

-- Trigger to notify admin when new ticket is created
CREATE OR REPLACE FUNCTION notify_on_ticket_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert in_app notification for admins
  INSERT INTO notifications (
    user_id,
    channel,
    category,
    template,
    title,
    body,
    action_url,
    event_type,
    status
  )
  SELECT 
    ur.user_id,
    'in_app',
    'operational',
    'support_ticket',
    'New Support Ticket',
    COALESCE(NEW.submitter_role, 'Customer') || ' submitted: ' || COALESCE(NEW.subject, 'No subject'),
    '/dispatch/support/' || NEW.id,
    'ticket_created',
    'sent'
  FROM user_roles ur
  WHERE ur.role = 'admin'
  LIMIT 5; -- Limit to first 5 admins to prevent spam
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trigger_notify_on_ticket_created ON support_tickets;

CREATE TRIGGER trigger_notify_on_ticket_created
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_ticket_created();

-- Trigger to notify ticket owner when admin replies
CREATE OR REPLACE FUNCTION notify_on_ticket_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket RECORD;
  v_admin_name TEXT;
BEGIN
  -- Get ticket info
  SELECT * INTO v_ticket FROM support_tickets WHERE id = NEW.ticket_id;
  
  IF v_ticket IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- If admin is replying, notify the ticket owner
  IF NEW.is_admin = true AND v_ticket.user_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      channel,
      category,
      template,
      title,
      body,
      action_url,
      event_type,
      status
    ) VALUES (
      v_ticket.user_id,
      'in_app',
      'transactional',
      'support_reply',
      'New Reply on Your Ticket',
      'Support team responded to: ' || COALESCE(v_ticket.subject, 'Your ticket'),
      '/support/tickets/' || NEW.ticket_id,
      'ticket_reply',
      'sent'
    )
    ON CONFLICT DO NOTHING;
  
  -- If user is replying, notify assigned admin (or all admins if unassigned)
  ELSIF NEW.is_admin = false THEN
    IF v_ticket.assigned_to IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        channel,
        category,
        template,
        title,
        body,
        action_url,
        event_type,
        status
      ) VALUES (
        v_ticket.assigned_to,
        'in_app',
        'operational',
        'support_reply',
        'Customer Replied',
        'New message on ticket: ' || COALESCE(v_ticket.subject, v_ticket.ticket_number),
        '/dispatch/support/' || NEW.ticket_id,
        'ticket_reply',
        'sent'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS trigger_notify_on_ticket_reply ON ticket_replies;

CREATE TRIGGER trigger_notify_on_ticket_reply
  AFTER INSERT ON ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_ticket_reply();