-- Network/IP intelligence for edge functions.
-- Stores hashed IP metadata and header-derived proxy/VPN signals without
-- persisting raw IP addresses.

CREATE TABLE IF NOT EXISTS public.network_security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  route text NOT NULL,
  ip_hash text,
  country text,
  region text,
  city text,
  asn text,
  colo text,
  user_agent text,
  request_id text,
  risk_score integer NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  signals text[] NOT NULL DEFAULT '{}',
  blocked boolean NOT NULL DEFAULT false
);

ALTER TABLE public.network_security_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read network security events" ON public.network_security_events;
CREATE POLICY "Admins can read network security events"
ON public.network_security_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_network_security_events_created_brin
  ON public.network_security_events USING brin (created_at);

CREATE INDEX IF NOT EXISTS idx_network_security_events_ip_created
  ON public.network_security_events (ip_hash, created_at DESC)
  WHERE ip_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_network_security_events_route_created
  ON public.network_security_events (route, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_network_security_events_risk
  ON public.network_security_events (risk_score DESC, created_at DESC)
  WHERE risk_score > 0;

COMMENT ON TABLE public.network_security_events IS
  'Hashed IP and edge network metadata for VPN/proxy/risk workflows. Raw IPs are intentionally not stored.';
