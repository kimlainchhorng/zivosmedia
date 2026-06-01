-- Affiliate links are owner-managed, but click/conversion/earnings metrics are
-- server-owned. Public redirect resolution goes through affiliate-link-redirect
-- so clients cannot forge analytics or earnings values.

DROP POLICY IF EXISTS affiliate_links_owner_read ON public.affiliate_links;
DROP POLICY IF EXISTS affiliate_links_owner_insert ON public.affiliate_links;
DROP POLICY IF EXISTS affiliate_links_owner_update ON public.affiliate_links;
DROP POLICY IF EXISTS affiliate_links_owner_delete ON public.affiliate_links;

CREATE POLICY affiliate_links_owner_read
  ON public.affiliate_links
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY affiliate_links_owner_insert
  ON public.affiliate_links
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY affiliate_links_owner_update
  ON public.affiliate_links
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY affiliate_links_owner_delete
  ON public.affiliate_links
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_direct_affiliate_link_metric_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_role text := COALESCE(auth.role(), current_setting('request.jwt.claim.role', true), '');
BEGIN
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

DROP TRIGGER IF EXISTS trg_prevent_direct_affiliate_link_metric_writes ON public.affiliate_links;

CREATE TRIGGER trg_prevent_direct_affiliate_link_metric_writes
BEFORE INSERT OR UPDATE ON public.affiliate_links
FOR EACH ROW
EXECUTE FUNCTION public.prevent_direct_affiliate_link_metric_writes();

CREATE OR REPLACE FUNCTION public.record_affiliate_link_click(p_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_url text;
BEGIN
  UPDATE public.affiliate_links
     SET click_count = click_count + 1
   WHERE slug = p_slug
   RETURNING target_url INTO v_target_url;

  IF v_target_url IS NULL THEN
    RAISE EXCEPTION 'affiliate_link_not_found';
  END IF;

  RETURN v_target_url;
END;
$$;

REVOKE ALL ON FUNCTION public.record_affiliate_link_click(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_link_click(text) TO service_role;

COMMENT ON FUNCTION public.prevent_direct_affiliate_link_metric_writes()
IS 'Blocks direct client writes to affiliate link click, conversion, and earnings metrics.';

COMMENT ON FUNCTION public.record_affiliate_link_click(text)
IS 'Atomically increments affiliate_links.click_count and returns the target URL for affiliate-link-redirect.';
