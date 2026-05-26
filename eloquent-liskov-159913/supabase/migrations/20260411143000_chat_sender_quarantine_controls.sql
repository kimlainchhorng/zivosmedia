-- Persistent temporary quarantine for suspicious chat senders + admin unblock controls.

CREATE TABLE IF NOT EXISTS public.chat_sender_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL UNIQUE,
  block_until TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL DEFAULT 'repeated_suspicious_behavior',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sender_blocks ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.chat_sender_blocks FROM anon, authenticated;

CREATE POLICY "Admins can view chat sender blocks"
  ON public.chat_sender_blocks
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage chat sender blocks"
  ON public.chat_sender_blocks
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chat_sender_blocks_sender
  ON public.chat_sender_blocks(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_sender_blocks_until
  ON public.chat_sender_blocks(block_until);

CREATE OR REPLACE FUNCTION public.cleanup_expired_chat_sender_blocks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.chat_sender_blocks
  WHERE block_until < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_clear_chat_sender_block(_sender_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can clear sender blocks';
  END IF;

  DELETE FROM public.chat_sender_blocks WHERE sender_id = _sender_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_chat_message_security()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  analysis RECORD;
  source_table_name TEXT := TG_TABLE_NAME;
  actor_id UUID;
  target_id UUID;
  message_row_id UUID;
  incoming_content TEXT;
  labels_with_limit TEXT[];
  active_block_until TIMESTAMPTZ;
BEGIN
  IF source_table_name = 'direct_messages' THEN
    incoming_content := NEW.message;
  ELSIF source_table_name = 'store_chat_messages' THEN
    incoming_content := NEW.content;
  ELSIF source_table_name = 'ticket_replies' THEN
    incoming_content := NEW.message;
  ELSE
    RETURN NEW;
  END IF;

  SELECT * INTO analysis FROM public.analyze_chat_content_security(incoming_content);

  IF source_table_name = 'store_chat_messages' THEN
    NEW.content := analysis.sanitized_content;
    actor_id := NEW.sender_id;
    target_id := NULL;
    message_row_id := NEW.id;
  ELSIF source_table_name = 'direct_messages' THEN
    NEW.message := analysis.sanitized_content;
    actor_id := NEW.sender_id;
    target_id := NEW.receiver_id;
    message_row_id := NEW.id;
  ELSE
    NEW.message := analysis.sanitized_content;
    actor_id := NEW.user_id;
    target_id := NULL;
    message_row_id := NEW.id;
  END IF;

  IF analysis.sanitized_content = '' THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  SELECT block_until INTO active_block_until
  FROM public.chat_sender_blocks
  WHERE sender_id = actor_id
    AND block_until > now()
  ORDER BY block_until DESC
  LIMIT 1;

  IF active_block_until IS NOT NULL THEN
    labels_with_limit := COALESCE(analysis.risk_labels, ARRAY[]::TEXT[]) || ARRAY['active_sender_quarantine'];

    INSERT INTO public.chat_security_events (
      source_table,
      message_id,
      sender_id,
      target_user_id,
      blocked,
      risk_score,
      risk_labels,
      content_excerpt
    ) VALUES (
      source_table_name,
      message_row_id,
      actor_id,
      target_id,
      true,
      GREATEST(COALESCE(analysis.risk_score, 0), 90),
      labels_with_limit,
      LEFT(analysis.sanitized_content, 240)
    );

    RAISE EXCEPTION 'Message blocked: sender is temporarily quarantined for suspicious activity';
  END IF;

  IF public.sender_chat_security_limited(actor_id) THEN
    labels_with_limit := COALESCE(analysis.risk_labels, ARRAY[]::TEXT[]) || ARRAY['rate_limited_sender'];

    INSERT INTO public.chat_sender_blocks (sender_id, block_until, reason, updated_at)
    VALUES (actor_id, now() + interval '30 minutes', 'repeated_suspicious_behavior', now())
    ON CONFLICT (sender_id)
    DO UPDATE SET
      block_until = EXCLUDED.block_until,
      reason = EXCLUDED.reason,
      updated_at = now();

    INSERT INTO public.chat_security_events (
      source_table,
      message_id,
      sender_id,
      target_user_id,
      blocked,
      risk_score,
      risk_labels,
      content_excerpt
    ) VALUES (
      source_table_name,
      message_row_id,
      actor_id,
      target_id,
      true,
      GREATEST(COALESCE(analysis.risk_score, 0), 85),
      labels_with_limit,
      LEFT(analysis.sanitized_content, 240)
    );

    RAISE EXCEPTION 'Message blocked: sender temporarily rate-limited due to repeated suspicious behavior';
  END IF;

  IF analysis.risk_score > 0 THEN
    INSERT INTO public.chat_security_events (
      source_table,
      message_id,
      sender_id,
      target_user_id,
      blocked,
      risk_score,
      risk_labels,
      content_excerpt
    ) VALUES (
      source_table_name,
      message_row_id,
      actor_id,
      target_id,
      analysis.blocked,
      analysis.risk_score,
      analysis.risk_labels,
      LEFT(analysis.sanitized_content, 240)
    );
  END IF;

  IF analysis.blocked THEN
    RAISE EXCEPTION 'Message blocked by security policy (unsafe protocol pattern detected)';
  END IF;

  RETURN NEW;
END;
$$;
