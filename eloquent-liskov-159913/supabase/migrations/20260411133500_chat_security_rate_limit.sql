-- Add adaptive sender throttling for repeated suspicious chat activity.

CREATE OR REPLACE FUNCTION public.sender_chat_security_limited(_sender_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  suspicious_count INTEGER := 0;
  blocked_count INTEGER := 0;
BEGIN
  IF _sender_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE risk_score >= 25),
    COUNT(*) FILTER (WHERE blocked = true)
  INTO suspicious_count, blocked_count
  FROM public.chat_security_events
  WHERE sender_id = _sender_id
    AND created_at >= now() - interval '10 minutes';

  RETURN blocked_count >= 2 OR suspicious_count >= 8;
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

  IF public.sender_chat_security_limited(actor_id) THEN
    labels_with_limit := COALESCE(analysis.risk_labels, ARRAY[]::TEXT[]) || ARRAY['rate_limited_sender'];

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
      GREATEST(COALESCE(analysis.risk_score, 0), 80),
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
