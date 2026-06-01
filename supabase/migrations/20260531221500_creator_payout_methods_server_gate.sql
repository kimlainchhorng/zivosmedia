-- Keep creator payout destinations behind the creator-payout-method-record
-- Edge Function without blocking normal creator profile edits.

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
      IF NEW.payout_method IS NOT NULL OR NEW.payout_details IS NOT NULL THEN
        RAISE EXCEPTION 'creator_payout_profile_server_gate_required';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.payout_method IS DISTINCT FROM OLD.payout_method
        OR NEW.payout_details IS DISTINCT FROM OLD.payout_details THEN
        RAISE EXCEPTION 'creator_payout_profile_server_gate_required';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_direct_creator_payout_profile_writes ON public.creator_profiles;

CREATE TRIGGER trg_prevent_direct_creator_payout_profile_writes
BEFORE INSERT OR UPDATE ON public.creator_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_direct_creator_payout_profile_writes();

COMMENT ON FUNCTION public.prevent_direct_creator_payout_profile_writes()
IS 'Blocks direct client writes to creator payout_method and payout_details; creator-payout-method-record writes with service_role after MFA and validation.';
