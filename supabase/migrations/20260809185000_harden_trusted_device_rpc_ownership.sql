-- Reconcile the trusted-device RPCs with the deployed five-argument contract.
-- The previous four-argument register_trusted_device overload trusted a caller-
-- supplied user id. Remove that overload so an authenticated caller cannot
-- choose a different account through the legacy RPC signature.
DROP FUNCTION IF EXISTS public.register_trusted_device(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.register_trusted_device(
  _user_id uuid,
  _device_fingerprint text,
  _device_name text DEFAULT NULL,
  _device_type text DEFAULT NULL,
  _ip_address text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'Can only register devices for your own account';
  END IF;

  INSERT INTO public.trusted_devices (
    user_id,
    device_fingerprint,
    device_name,
    device_type,
    last_used,
    is_active
  )
  VALUES (
    _user_id,
    _device_fingerprint,
    _device_name,
    _device_type,
    now(),
    true
  )
  ON CONFLICT (user_id, device_fingerprint)
  DO UPDATE SET
    last_used = now(),
    is_active = true,
    device_name = COALESCE(EXCLUDED.device_name, public.trusted_devices.device_name),
    device_type = COALESCE(EXCLUDED.device_type, public.trusted_devices.device_type);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_trusted_device(
  _user_id uuid,
  _device_fingerprint text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT auth.uid()) IS DISTINCT FROM _user_id THEN
    RAISE EXCEPTION 'Can only remove devices from your own account';
  END IF;

  DELETE FROM public.trusted_devices
  WHERE user_id = _user_id
    AND device_fingerprint = _device_fingerprint;
END;
$$;

-- SECURITY DEFINER functions receive PUBLIC execute by default when created.
-- Only signed-in application users need these RPCs; both routines enforce the
-- caller identity above before changing a trusted-device row.
REVOKE ALL ON FUNCTION public.register_trusted_device(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_trusted_device(uuid, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_trusted_device(uuid, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_trusted_device(uuid, text, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.remove_trusted_device(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_trusted_device(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.remove_trusted_device(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_trusted_device(uuid, text) TO service_role;
