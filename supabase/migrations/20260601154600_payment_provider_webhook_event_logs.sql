-- Event logs for Eats and creator-tip provider webhooks.
-- These tables are the idempotency boundary for PayPal/Square redeliveries:
-- the Edge Functions insert with ignoreDuplicates=true on provider event ids
-- before applying payment, refund, dispatch, or wallet-credit side effects.

CREATE TABLE IF NOT EXISTS public.eats_paypal_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_created_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_id UUID,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','applied','skipped','error')),
  error_message TEXT,
  payload JSONB
);

ALTER TABLE public.eats_paypal_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view Eats PayPal webhook events" ON public.eats_paypal_webhook_events;
CREATE POLICY "Admins view Eats PayPal webhook events"
  ON public.eats_paypal_webhook_events FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE INDEX IF NOT EXISTS eats_paypal_webhook_events_type_idx
  ON public.eats_paypal_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS eats_paypal_webhook_events_order_idx
  ON public.eats_paypal_webhook_events (order_id);

CREATE INDEX IF NOT EXISTS eats_paypal_webhook_events_received_at_idx
  ON public.eats_paypal_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS eats_paypal_webhook_events_paypal_order_idx
  ON public.eats_paypal_webhook_events (paypal_order_id);

CREATE INDEX IF NOT EXISTS eats_paypal_webhook_events_paypal_capture_idx
  ON public.eats_paypal_webhook_events (paypal_capture_id);

CREATE TABLE IF NOT EXISTS public.eats_square_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  square_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_created_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_id UUID,
  square_payment_id TEXT,
  square_checkout_id TEXT,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','applied','skipped','error')),
  error_message TEXT,
  payload JSONB
);

ALTER TABLE public.eats_square_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view Eats Square webhook events" ON public.eats_square_webhook_events;
CREATE POLICY "Admins view Eats Square webhook events"
  ON public.eats_square_webhook_events FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE INDEX IF NOT EXISTS eats_square_webhook_events_type_idx
  ON public.eats_square_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS eats_square_webhook_events_order_idx
  ON public.eats_square_webhook_events (order_id);

CREATE INDEX IF NOT EXISTS eats_square_webhook_events_received_at_idx
  ON public.eats_square_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS eats_square_webhook_events_square_payment_idx
  ON public.eats_square_webhook_events (square_payment_id);

CREATE INDEX IF NOT EXISTS eats_square_webhook_events_square_checkout_idx
  ON public.eats_square_webhook_events (square_checkout_id);

CREATE TABLE IF NOT EXISTS public.tip_paypal_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_created_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tip_id UUID,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','applied','skipped','error')),
  error_message TEXT,
  payload JSONB
);

ALTER TABLE public.tip_paypal_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view tip PayPal webhook events" ON public.tip_paypal_webhook_events;
CREATE POLICY "Admins view tip PayPal webhook events"
  ON public.tip_paypal_webhook_events FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE INDEX IF NOT EXISTS tip_paypal_webhook_events_type_idx
  ON public.tip_paypal_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS tip_paypal_webhook_events_tip_idx
  ON public.tip_paypal_webhook_events (tip_id);

CREATE INDEX IF NOT EXISTS tip_paypal_webhook_events_received_at_idx
  ON public.tip_paypal_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS tip_paypal_webhook_events_paypal_order_idx
  ON public.tip_paypal_webhook_events (paypal_order_id);

CREATE INDEX IF NOT EXISTS tip_paypal_webhook_events_paypal_capture_idx
  ON public.tip_paypal_webhook_events (paypal_capture_id);

CREATE TABLE IF NOT EXISTS public.tip_square_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  square_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_created_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tip_id UUID,
  square_payment_id TEXT,
  square_checkout_id TEXT,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received','applied','skipped','error')),
  error_message TEXT,
  payload JSONB
);

ALTER TABLE public.tip_square_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view tip Square webhook events" ON public.tip_square_webhook_events;
CREATE POLICY "Admins view tip Square webhook events"
  ON public.tip_square_webhook_events FOR SELECT TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'));

CREATE INDEX IF NOT EXISTS tip_square_webhook_events_type_idx
  ON public.tip_square_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS tip_square_webhook_events_tip_idx
  ON public.tip_square_webhook_events (tip_id);

CREATE INDEX IF NOT EXISTS tip_square_webhook_events_received_at_idx
  ON public.tip_square_webhook_events (received_at DESC);

CREATE INDEX IF NOT EXISTS tip_square_webhook_events_square_payment_idx
  ON public.tip_square_webhook_events (square_payment_id);

CREATE INDEX IF NOT EXISTS tip_square_webhook_events_square_checkout_idx
  ON public.tip_square_webhook_events (square_checkout_id);
