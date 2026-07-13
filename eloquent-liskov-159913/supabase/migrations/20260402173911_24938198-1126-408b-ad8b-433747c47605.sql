
CREATE OR REPLACE FUNCTION public.append_ice_candidate(
  p_call_id UUID,
  p_field TEXT,
  p_candidate JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_field = 'caller_ice_candidates' THEN
    UPDATE call_signals
    SET caller_ice_candidates = array_append(caller_ice_candidates, p_candidate)
    WHERE id = p_call_id AND caller_id = auth.uid();
  ELSIF p_field = 'callee_ice_candidates' THEN
    UPDATE call_signals
    SET callee_ice_candidates = array_append(callee_ice_candidates, p_candidate)
    WHERE id = p_call_id AND callee_id = auth.uid();
  END IF;
END;
$$;
