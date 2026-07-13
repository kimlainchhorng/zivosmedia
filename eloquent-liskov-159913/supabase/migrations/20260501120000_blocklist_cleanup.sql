-- Housekeeping: prune expired ip_blocklist rows.
--
-- WHY: ip_blocklist rows are LEFT in place after `expires_at` so an admin
-- reviewing history can see "this IP was blocked 3 weeks ago for X". But the
-- table grows unbounded, and the index is_ip_blocked() walks gets slower over
-- time. Pruning rows older than 90 days past expiry keeps the working set
-- small while preserving recent forensics.
--
-- The function is admin-only (manual run from AdminThreatHistoryPage) and
-- service-role (cron job in pg_cron / scheduled edge function). It returns
-- the number of rows deleted.

CREATE OR REPLACE FUNCTION public.prune_expired_ip_blocklist(
  _retain_days INT DEFAULT 90
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff TIMESTAMPTZ;
  v_count  INT;
  v_days   INT;
BEGIN
  -- Caller must be admin OR running with service_role bypass.
  IF NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_days   := LEAST(GREATEST(COALESCE(_retain_days, 90), 7), 3650);
  v_cutoff := now() - make_interval(days => v_days);

  WITH deleted AS (
    DELETE FROM public.ip_blocklist
    WHERE expires_at IS NOT NULL
      AND expires_at < v_cutoff
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_count FROM deleted;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.prune_expired_ip_blocklist(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prune_expired_ip_blocklist(INT)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.prune_expired_ip_blocklist(INT) IS
  'Deletes ip_blocklist rows whose expires_at is older than _retain_days '
  '(default 90). Admin or service_role only. Returns number of rows deleted.';
