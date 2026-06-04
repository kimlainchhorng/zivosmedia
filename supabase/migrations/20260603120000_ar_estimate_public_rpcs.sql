-- Auto-repair: secure public access to a shared estimate via SECURITY DEFINER RPCs.
--
-- The old approach exposed two broad anon policies on ar_estimates:
--   • SELECT USING (share_token IS NOT NULL)  -> any visitor can read EVERY
--     tokened estimate (all shops' customer names, phones, VINs, totals).
--   • UPDATE USING (share_token IS NOT NULL)  -> any visitor can modify ANY
--     tokened estimate.
-- RLS cannot scope a read to "only the row whose token the caller knows"
-- (a policy can't see the query's WHERE clause), so the caller could simply
-- drop the token filter and dump/overwrite everything. The fix is to expose
-- ONLY these token-scoped RPCs to anon and drop the broad policies (the drop
-- ships in a follow-up migration, applied once the frontend is on the RPCs).

-- Read a single estimate (+ its shop branding) by exact share token.
CREATE OR REPLACE FUNCTION public.ar_get_estimate_by_share_token(_token text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'estimate', to_jsonb(e),
    'store', jsonb_build_object(
      'name', sp.name,
      'logo_url', sp.logo_url,
      'phone', sp.phone,
      'address', sp.address
    )
  )
  FROM public.ar_estimates e
  LEFT JOIN public.store_profiles sp ON sp.id = e.store_id
  WHERE e.share_token = _token
    AND _token IS NOT NULL
    AND length(_token) > 0
  LIMIT 1;
$$;

-- Stamp first-view time (idempotent; only sets it once).
CREATE OR REPLACE FUNCTION public.ar_mark_estimate_viewed(_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ar_estimates
  SET customer_viewed_at = now()
  WHERE share_token = _token
    AND _token IS NOT NULL
    AND customer_viewed_at IS NULL;
$$;

-- Record the customer's approve/decline decision for that exact token.
CREATE OR REPLACE FUNCTION public.ar_respond_to_estimate(_token text, _decision text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF _decision NOT IN ('approved', 'declined') THEN
    RAISE EXCEPTION 'invalid decision %', _decision;
  END IF;
  UPDATE public.ar_estimates
  SET status = _decision,
      customer_responded_at = now()
  WHERE share_token = _token
    AND _token IS NOT NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ar_get_estimate_by_share_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ar_mark_estimate_viewed(text)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ar_respond_to_estimate(text, text)   TO anon, authenticated;
