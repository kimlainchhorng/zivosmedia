
-- WebRTC signaling table
CREATE TABLE public.call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL,
  callee_id UUID NOT NULL,
  call_type TEXT NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'answered', 'ended', 'declined', 'missed')),
  offer JSONB,
  answer JSONB,
  caller_ice_candidates JSONB[] DEFAULT '{}',
  callee_ice_candidates JSONB[] DEFAULT '{}',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own calls"
ON public.call_signals FOR SELECT TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users can create calls"
ON public.call_signals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can update calls"
ON public.call_signals FOR UPDATE TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE INDEX idx_call_signals_callee ON public.call_signals(callee_id, status);
CREATE INDEX idx_call_signals_caller ON public.call_signals(caller_id, status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
