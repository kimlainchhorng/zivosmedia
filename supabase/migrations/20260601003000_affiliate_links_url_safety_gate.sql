-- Affiliate redirect targets must be ordinary web URLs. This is a database
-- backstop for the share-sheet URL safety check and protects /r/:slug from
-- javascript:, data:, file:, and other non-web redirect targets.

CREATE OR REPLACE FUNCTION public.prevent_direct_affiliate_link_metric_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_role text := COALESCE(auth.role(), current_setting('request.jwt.claim.role', true), '');
  normalized_target text := lower(coalesce(NEW.target_url, ''));
BEGIN
  IF normalized_target !~ '^https?://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'affiliate_link_target_url_invalid';
  END IF;

  IF request_role <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      IF COALESCE(NEW.click_count, 0) <> 0
        OR COALESCE(NEW.conversion_count, 0) <> 0
        OR COALESCE(NEW.earnings_cents, 0) <> 0 THEN
        RAISE EXCEPTION 'affiliate_link_metrics_server_gate_required';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.click_count IS DISTINCT FROM OLD.click_count
        OR NEW.conversion_count IS DISTINCT FROM OLD.conversion_count
        OR NEW.earnings_cents IS DISTINCT FROM OLD.earnings_cents THEN
        RAISE EXCEPTION 'affiliate_link_metrics_server_gate_required';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_direct_affiliate_link_metric_writes()
IS 'Blocks unsafe affiliate redirect target URLs and direct client writes to affiliate link click, conversion, and earnings metrics.';
