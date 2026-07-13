-- Creator profile rows include both user-editable profile fields and
-- server-owned proof/status fields. Keep normal profile setup working while
-- preventing clients from forging verification, earnings, follower/subscriber
-- counts, active state, or payout destination fields.

CREATE OR REPLACE FUNCTION public.prevent_direct_creator_payout_profile_writes()
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
      IF NEW.payout_method IS NOT NULL
        OR NEW.payout_details IS NOT NULL
        OR COALESCE(NEW.total_earnings_cents, 0) <> 0
        OR COALESCE(NEW.subscriber_count, 0) <> 0
        OR COALESCE(NEW.follower_count, 0) <> 0
        OR COALESCE(NEW.is_verified, false) <> false
        OR COALESCE(NEW.is_active, true) <> true THEN
        RAISE EXCEPTION 'creator_profile_protected_fields_server_gate_required';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.payout_method IS DISTINCT FROM OLD.payout_method
        OR NEW.payout_details IS DISTINCT FROM OLD.payout_details
        OR NEW.total_earnings_cents IS DISTINCT FROM OLD.total_earnings_cents
        OR NEW.subscriber_count IS DISTINCT FROM OLD.subscriber_count
        OR NEW.follower_count IS DISTINCT FROM OLD.follower_count
        OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
        OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
        RAISE EXCEPTION 'creator_profile_protected_fields_server_gate_required';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_direct_creator_payout_profile_writes()
IS 'Blocks direct client writes to creator payout, verification, earnings, counter, and active-state fields while allowing normal profile edits.';
