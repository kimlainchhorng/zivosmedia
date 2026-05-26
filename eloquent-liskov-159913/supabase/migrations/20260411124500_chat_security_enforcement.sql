-- Server-side chat security enforcement
-- Adds database-level sanitization, threat scoring, and security event logging.

CREATE TABLE IF NOT EXISTS public.chat_security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table TEXT NOT NULL CHECK (source_table IN ('direct_messages', 'store_chat_messages', 'ticket_replies')),
  message_id UUID,
  sender_id UUID,
  target_user_id UUID,
  blocked BOOLEAN NOT NULL DEFAULT false,
  risk_score INTEGER NOT NULL DEFAULT 0,
  risk_labels TEXT[] NOT NULL DEFAULT '{}'::text[],
  content_excerpt TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_security_events ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.chat_security_events FROM anon, authenticated;

CREATE POLICY "Admins can view chat security events"
  ON public.chat_security_events
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert chat security events"
  ON public.chat_security_events
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_chat_security_events_created
  ON public.chat_security_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_security_events_sender
  ON public.chat_security_events(sender_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.analyze_chat_content_security(content_input TEXT)
RETURNS TABLE (
  sanitized_content TEXT,
  blocked BOOLEAN,
  risk_score INTEGER,
  risk_labels TEXT[]
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
  labels TEXT[] := ARRAY[]::TEXT[];
  score INTEGER := 0;
BEGIN
  cleaned := btrim(regexp_replace(COALESCE(content_input, ''), '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'));

  IF cleaned = '' THEN
    RETURN QUERY SELECT cleaned, false, 0, ARRAY[]::TEXT[];
    RETURN;
  END IF;

  IF cleaned ~* '(^|[[:space:]])(javascript|data|vbscript|blob)[[:space:]]*:' THEN
    labels := labels || ARRAY['dangerous_protocol'];
    score := score + 100;
  END IF;

  IF cleaned ~* 'hxxps?://' THEN
    labels := labels || ARRAY['obfuscated_link'];
    score := score + 25;
  END IF;

  IF cleaned ~* 'https?://[^[:space:]/@]+@[^[:space:]/]+' THEN
    labels := labels || ARRAY['credential_in_url'];
    score := score + 35;
  END IF;

  IF cleaned ~* 'https?://[^[:space:]]*xn--' THEN
    labels := labels || ARRAY['punycode_domain'];
    score := score + 20;
  END IF;

  IF cleaned ~* 'bit\\.ly|tinyurl\\.com|t\\.co/|rb\\.gy|rebrand\\.ly' THEN
    labels := labels || ARRAY['shortener_link'];
    score := score + 15;
  END IF;

  RETURN QUERY
  SELECT
    cleaned,
    (score >= 100),
    score,
    COALESCE(labels, ARRAY[]::TEXT[]);
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
  ELSE
    NEW.message := analysis.sanitized_content;
  END IF;

  IF analysis.sanitized_content = '' THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  IF source_table_name = 'direct_messages' THEN
    actor_id := NEW.sender_id;
    target_id := NEW.receiver_id;
    message_row_id := NEW.id;
  ELSIF source_table_name = 'store_chat_messages' THEN
    actor_id := NEW.sender_id;
    target_id := NULL;
    message_row_id := NEW.id;
  ELSIF source_table_name = 'ticket_replies' THEN
    actor_id := NEW.user_id;
    target_id := NULL;
    message_row_id := NEW.id;
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

DROP TRIGGER IF EXISTS trg_dm_enforce_chat_security ON public.direct_messages;
CREATE TRIGGER trg_dm_enforce_chat_security
BEFORE INSERT OR UPDATE OF message
ON public.direct_messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_chat_message_security();

DROP TRIGGER IF EXISTS trg_store_chat_enforce_chat_security ON public.store_chat_messages;
CREATE TRIGGER trg_store_chat_enforce_chat_security
BEFORE INSERT OR UPDATE OF content
ON public.store_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_chat_message_security();

DROP TRIGGER IF EXISTS trg_ticket_replies_enforce_chat_security ON public.ticket_replies;
CREATE TRIGGER trg_ticket_replies_enforce_chat_security
BEFORE INSERT OR UPDATE OF message
ON public.ticket_replies
FOR EACH ROW
EXECUTE FUNCTION public.enforce_chat_message_security();
