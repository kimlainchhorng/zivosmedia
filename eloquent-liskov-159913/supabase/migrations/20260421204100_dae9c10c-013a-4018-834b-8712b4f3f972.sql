-- Audit table for masked-call session closures
CREATE TABLE public.call_session_closure_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id uuid,
  twilio_proxy_session_sid text,
  closure_source text NOT NULL CHECK (closure_source IN ('trigger','cron','manual','terminal_status_guard')),
  twilio_status text NOT NULL CHECK (twilio_status IN ('closed','not_found','error','skipped')),
  twilio_response_code integer,
  error_message text,
  attempt_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ccsa_ride ON public.call_session_closure_audit(ride_request_id);
CREATE INDEX idx_ccsa_created ON public.call_session_closure_audit(created_at DESC);

ALTER TABLE public.call_session_closure_audit ENABLE ROW LEVEL SECURITY;

-- Admins can read
CREATE POLICY "admins read closure audit"
ON public.call_session_closure_audit
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Service role inserts via edge functions (no client INSERT policy = denied for normal users; service role bypasses RLS)

-- Add tracking columns to trip_call_sessions
ALTER TABLE public.trip_call_sessions
  ADD COLUMN IF NOT EXISTS closure_failed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closure_attempts integer NOT NULL DEFAULT 0;