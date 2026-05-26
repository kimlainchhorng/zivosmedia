-- Security Sentinel project: tamper-evident incident escalation and admin acknowledgement.

CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('medium', 'high', 'critical')),
  event_ref UUID,
  sender_id UUID,
  summary TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  chain_hash TEXT,
  prev_chain_hash TEXT
);

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

REVOKE INSERT, UPDATE, DELETE ON public.security_incidents FROM anon, authenticated;

CREATE POLICY "Admins view security incidents"
  ON public.security_incidents
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert incidents"
  ON public.security_incidents
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins update incidents"
  ON public.security_incidents
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_security_incidents_created
  ON public.security_incidents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_incidents_ack
  ON public.security_incidents(acknowledged, severity, created_at DESC);

CREATE OR REPLACE FUNCTION public.compute_incident_chain_hash(
  _prev_hash TEXT,
  _source TEXT,
  _severity TEXT,
  _event_ref UUID,
  _created_at TIMESTAMPTZ
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      coalesce(_prev_hash, '') || '|' ||
      coalesce(_source, '') || '|' ||
      coalesce(_severity, '') || '|' ||
      coalesce(_event_ref::text, '') || '|' ||
      coalesce(_created_at::text, ''),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.escalate_chat_security_event_to_incident()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sev TEXT := 'medium';
  prev_hash TEXT;
  new_hash TEXT;
BEGIN
  IF NOT (NEW.blocked OR NEW.risk_score >= 75) THEN
    RETURN NEW;
  END IF;

  IF NEW.risk_score >= 90 OR ('dangerous_protocol' = ANY(COALESCE(NEW.risk_labels, ARRAY[]::TEXT[]))) THEN
    sev := 'critical';
  ELSIF NEW.risk_score >= 80 THEN
    sev := 'high';
  END IF;

  SELECT chain_hash INTO prev_hash
  FROM public.security_incidents
  ORDER BY created_at DESC
  LIMIT 1;

  new_hash := public.compute_incident_chain_hash(
    prev_hash,
    'chat_security',
    sev,
    NEW.id,
    now()
  );

  INSERT INTO public.security_incidents (
    source,
    severity,
    event_ref,
    sender_id,
    summary,
    details,
    prev_chain_hash,
    chain_hash
  ) VALUES (
    'chat_security',
    sev,
    NEW.id,
    NEW.sender_id,
    format('Chat security incident (%s)', NEW.source_table),
    jsonb_build_object(
      'source_table', NEW.source_table,
      'risk_score', NEW.risk_score,
      'risk_labels', NEW.risk_labels,
      'blocked', NEW.blocked,
      'content_excerpt', NEW.content_excerpt
    ),
    prev_hash,
    new_hash
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_escalate_chat_security_event_to_incident ON public.chat_security_events;
CREATE TRIGGER trg_escalate_chat_security_event_to_incident
AFTER INSERT ON public.chat_security_events
FOR EACH ROW
EXECUTE FUNCTION public.escalate_chat_security_event_to_incident();

CREATE OR REPLACE FUNCTION public.admin_ack_security_incident(_incident_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can acknowledge incidents';
  END IF;

  UPDATE public.security_incidents
  SET
    acknowledged = true,
    acknowledged_by = auth.uid(),
    acknowledged_at = now()
  WHERE id = _incident_id;

  RETURN true;
END;
$$;
