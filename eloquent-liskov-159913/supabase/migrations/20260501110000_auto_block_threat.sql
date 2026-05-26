-- Auto-block on aggregated threat score.
--
-- WHY: a single WAF or scanner hit isn't enough to ban an IP — sometimes those
-- come from misconfigured legitimate clients. But when an IP already has a
-- documented attacker history (multiple blocked link attempts, prior incidents,
-- repeated WAF blocks), the next hit should automatically extend the
-- blocklist. This is the "check history, then protect" automation: instead of
-- waiting for an admin to review the AdminThreatHistoryPage, the edge layer
-- self-blocks IPs that cross the threshold.
--
-- This RPC is callable by service_role only (called from edge functions with
-- the service key). It computes the score in-DB so the edge isolate doesn't
-- have to round-trip data — atomic decision.

CREATE OR REPLACE FUNCTION public.auto_block_if_high_threat(
  _ip_hash    TEXT,
  _ip_address TEXT DEFAULT NULL,
  _user_id    UUID DEFAULT NULL,
  _hours      INT  DEFAULT 24,
  _threshold  INT  DEFAULT 75,
  _block_hours INT DEFAULT 24,
  _reason     TEXT DEFAULT 'auto_threat_score_exceeded'
)
RETURNS TABLE (
  score    INT,
  blocked  BOOLEAN,
  block_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since      TIMESTAMPTZ;
  v_hours      INT;
  v_threshold  INT;
  v_block_hrs  INT;
  v_score      INT := 0;
  v_blocked_links INT := 0;
  v_blocked_events INT := 0;
  v_chat_blocks    INT := 0;
  v_critical_inc   INT := 0;
  v_existing       UUID;
  v_block_id       UUID;
  v_expires_at     TIMESTAMPTZ;
BEGIN
  -- Defensive bounds
  v_hours      := LEAST(GREATEST(COALESCE(_hours, 24), 1), 720);
  v_threshold  := LEAST(GREATEST(COALESCE(_threshold, 75), 10), 100);
  v_block_hrs  := LEAST(GREATEST(COALESCE(_block_hours, 24), 1), 24 * 30);
  v_since      := now() - make_interval(hours => v_hours);

  -- 1. Already blocked? Return early so we don't double-insert.
  SELECT id INTO v_existing
  FROM public.ip_blocklist
  WHERE ip_hash = _ip_hash
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN QUERY SELECT 100, FALSE, v_existing;
    RETURN;
  END IF;

  -- 2. Compute score from recent activity.
  SELECT COUNT(*) INTO v_blocked_links
  FROM public.blocked_link_attempts
  WHERE created_at >= v_since
    AND ((_ip_hash IS NOT NULL AND ip_hash = _ip_hash)
      OR (_user_id IS NOT NULL AND user_id = _user_id));

  SELECT COUNT(*) INTO v_blocked_events
  FROM public.security_events
  WHERE created_at >= v_since
    AND is_blocked = true
    AND ((_ip_address IS NOT NULL AND ip_address::TEXT = _ip_address)
      OR (_user_id IS NOT NULL AND user_id = _user_id));

  IF _user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_chat_blocks
    FROM public.chat_security_events
    WHERE created_at >= v_since
      AND blocked = true
      AND sender_id = _user_id;
  END IF;

  SELECT COUNT(*) INTO v_critical_inc
  FROM public.security_incidents
  WHERE created_at >= v_since
    AND severity IN ('high', 'critical')
    AND NOT acknowledged;

  v_score := LEAST(
    100,
    (v_blocked_links * 8)
      + (v_blocked_events * 4)
      + (v_chat_blocks * 6)
      + (v_critical_inc * 25)
  );

  -- 3. Below threshold → just return the score.
  IF v_score < v_threshold THEN
    RETURN QUERY SELECT v_score, FALSE, NULL::UUID;
    RETURN;
  END IF;

  -- 4. Threshold crossed → insert blocklist row + audit.
  v_expires_at := now() + make_interval(hours => v_block_hrs);

  INSERT INTO public.ip_blocklist (ip_hash, reason, notes, expires_at)
  VALUES (
    _ip_hash,
    _reason,
    format(
      'auto-block; score=%s links=%s events=%s chat=%s incidents=%s window=%sh',
      v_score, v_blocked_links, v_blocked_events, v_chat_blocks, v_critical_inc, v_hours
    ),
    v_expires_at
  )
  RETURNING id INTO v_block_id;

  -- Fire-and-forget audit row in security_events
  INSERT INTO public.security_events (event_type, severity, ip_address, event_data, is_blocked, user_id)
  VALUES (
    'ip_blocklist.auto_added',
    'warn',
    NULLIF(_ip_address, '')::INET,
    jsonb_build_object(
      'ip_hash', _ip_hash,
      'score', v_score,
      'threshold', v_threshold,
      'block_hours', v_block_hrs,
      'reason', _reason,
      'window_hours', v_hours
    ),
    true,
    _user_id
  );

  RETURN QUERY SELECT v_score, TRUE, v_block_id;
END;
$$;

REVOKE ALL ON FUNCTION public.auto_block_if_high_threat(TEXT, TEXT, UUID, INT, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auto_block_if_high_threat(TEXT, TEXT, UUID, INT, INT, INT, TEXT)
  TO service_role;

COMMENT ON FUNCTION public.auto_block_if_high_threat(TEXT, TEXT, UUID, INT, INT, INT, TEXT) IS
  'Service-role only. Computes the aggregate threat score for an IP/user over '
  'the given window; if score >= threshold, auto-adds to ip_blocklist and '
  'logs to security_events. Idempotent: returns existing block_id if the IP '
  'is already blocked.';
