
-- ============ DRIVER MODERATION ============
CREATE TABLE IF NOT EXISTS public.driver_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL,
  reason TEXT NOT NULL,
  flagged_by UUID,
  flagged_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  related_report_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_driver_flags_active ON public.driver_flags(driver_id, active, flagged_until);
ALTER TABLE public.driver_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage driver flags" ON public.driver_flags;
CREATE POLICY "Admins manage driver flags" ON public.driver_flags
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Drivers view own flags" ON public.driver_flags;
CREATE POLICY "Drivers view own flags" ON public.driver_flags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = driver_id AND d.user_id = auth.uid())
  );

CREATE TABLE IF NOT EXISTS public.abuse_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  reported_driver_id UUID,
  ride_request_id UUID,
  category TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abuse_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own reports" ON public.abuse_reports;
CREATE POLICY "Users create own reports" ON public.abuse_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
DROP POLICY IF EXISTS "Users view own reports" ON public.abuse_reports;
CREATE POLICY "Users view own reports" ON public.abuse_reports
  FOR SELECT USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage reports" ON public.abuse_reports;
CREATE POLICY "Admins manage reports" ON public.abuse_reports
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ============ RECEIPTS ============
CREATE TABLE IF NOT EXISTS public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  user_id UUID NOT NULL,
  pdf_path TEXT NOT NULL,
  email_sent_at TIMESTAMPTZ,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_receipts_ref ON public.receipts(type, reference_id);
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own receipts" ON public.receipts;
CREATE POLICY "Users view own receipts" ON public.receipts
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ RIDE REFUND REQUESTS ============
CREATE TABLE IF NOT EXISTS public.ride_refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id UUID NOT NULL,
  requester_id UUID NOT NULL,
  reason_category TEXT NOT NULL,
  description TEXT,
  requested_amount_cents INTEGER NOT NULL CHECK (requested_amount_cents > 0),
  approved_amount_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  stripe_refund_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ride_refund_status ON public.ride_refund_requests(status, created_at DESC);
ALTER TABLE public.ride_refund_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users create own ride refunds" ON public.ride_refund_requests;
CREATE POLICY "Users create own ride refunds" ON public.ride_refund_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
DROP POLICY IF EXISTS "Users view own ride refunds" ON public.ride_refund_requests;
CREATE POLICY "Users view own ride refunds" ON public.ride_refund_requests
  FOR SELECT USING (auth.uid() = requester_id OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins manage ride refunds" ON public.ride_refund_requests;
CREATE POLICY "Admins manage ride refunds" ON public.ride_refund_requests
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ============ FINANCIAL LEDGER ============
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ride_request_id UUID,
  order_id UUID,
  entry_type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  balance_after_cents INTEGER,
  stripe_reference TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ledger_user ON public.financial_ledger(user_id, created_at DESC);
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own ledger" ON public.financial_ledger;
CREATE POLICY "Users view own ledger" ON public.financial_ledger
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============ TRIP MESSAGES (extend existing table) ============
ALTER TABLE public.trip_messages ADD COLUMN IF NOT EXISTS ride_request_id UUID;
ALTER TABLE public.trip_messages ADD COLUMN IF NOT EXISTS sender_role TEXT;
ALTER TABLE public.trip_messages ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.trip_messages ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE public.trip_messages ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
CREATE INDEX IF NOT EXISTS idx_trip_messages_ride_req ON public.trip_messages(ride_request_id, created_at);

CREATE OR REPLACE FUNCTION public.is_trip_participant(_ride_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ride_requests r
    LEFT JOIN public.drivers d ON d.id = r.assigned_driver_id
    WHERE r.id = _ride_id AND (r.user_id = _user_id OR d.user_id = _user_id)
  );
$$;

ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants read trip messages" ON public.trip_messages;
CREATE POLICY "Participants read trip messages" ON public.trip_messages
  FOR SELECT USING (
    ride_request_id IS NOT NULL
    AND public.is_trip_participant(ride_request_id, auth.uid())
    AND (moderation_status = 'approved' OR sender_id = auth.uid())
  );
DROP POLICY IF EXISTS "Participants send trip messages" ON public.trip_messages;
CREATE POLICY "Participants send trip messages" ON public.trip_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND ride_request_id IS NOT NULL
    AND public.is_trip_participant(ride_request_id, auth.uid())
  );
DROP POLICY IF EXISTS "Admins read all trip messages" ON public.trip_messages;
CREATE POLICY "Admins read all trip messages" ON public.trip_messages
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update trip messages" ON public.trip_messages;
CREATE POLICY "Admins update trip messages" ON public.trip_messages
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- ============ TRIP CALL SESSIONS ============
CREATE TABLE IF NOT EXISTS public.trip_call_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id UUID NOT NULL,
  twilio_proxy_session_sid TEXT,
  rider_proxy_number TEXT,
  driver_proxy_number TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_call_sessions_ride ON public.trip_call_sessions(ride_request_id);
ALTER TABLE public.trip_call_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read call sessions" ON public.trip_call_sessions;
CREATE POLICY "Participants read call sessions" ON public.trip_call_sessions
  FOR SELECT USING (public.is_trip_participant(ride_request_id, auth.uid()));

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-receipts', 'trip-receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users read own receipts files" ON storage.objects;
CREATE POLICY "Users read own receipts files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trip-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
DROP POLICY IF EXISTS "Admins read all receipts files" ON storage.objects;
CREATE POLICY "Admins read all receipts files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'trip-receipts' AND public.has_role(auth.uid(), 'admin')
  );
