-- Additional resilience limits: anti-flood message throttling and payload size caps.

CREATE OR REPLACE FUNCTION public.sender_message_flood_limited(_sender_id UUID, _source_table TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  message_count INTEGER := 0;
  per_minute_limit INTEGER := 20;
BEGIN
  IF _sender_id IS NULL THEN
    RETURN false;
  END IF;

  IF _source_table = 'ticket_replies' THEN
    per_minute_limit := 12;
    SELECT COUNT(*)
      INTO message_count
    FROM public.ticket_replies
    WHERE user_id = _sender_id
      AND created_at >= now() - interval '1 minute';
  ELSIF _source_table = 'store_chat_messages' THEN
    per_minute_limit := 30;
    SELECT COUNT(*)
      INTO message_count
    FROM public.store_chat_messages
    WHERE sender_id = _sender_id
      AND created_at >= now() - interval '1 minute';
  ELSE
    SELECT COUNT(*)
      INTO message_count
    FROM public.direct_messages
    WHERE sender_id = _sender_id
      AND created_at >= now() - interval '1 minute';
  END IF;

  RETURN message_count >= per_minute_limit;
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

  IF char_length(analysis.sanitized_content) > 4000 THEN
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
      70,
      ARRAY['oversized_payload'],
      LEFT(analysis.sanitized_content, 240)
    );

    RAISE EXCEPTION 'Message blocked: payload too large';
  END IF;

  IF public.sender_message_flood_limited(actor_id, source_table_name) THEN
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
      75,
      ARRAY['flood_rate_limit'],
      LEFT(analysis.sanitized_content, 240)
    );

    RAISE EXCEPTION 'Message blocked: too many messages in a short time';
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
