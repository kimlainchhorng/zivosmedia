
-- Security definer function to check if a device is trusted
CREATE OR REPLACE FUNCTION public.is_device_trusted(
  _user_id UUID,
  _device_fingerprint TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trusted_devices
    WHERE user_id = _user_id
      AND device_fingerprint = _device_fingerprint
  )
$$;

-- Function to register a trusted device
CREATE OR REPLACE FUNCTION public.register_trusted_device(
  _user_id UUID,
  _device_fingerprint TEXT,
  _device_name TEXT DEFAULT NULL,
  _ip_address TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.trusted_devices (user_id, device_fingerprint, device_name, ip_address)
  VALUES (_user_id, _device_fingerprint, _device_name, _ip_address)
  ON CONFLICT (user_id, device_fingerprint)
  DO UPDATE SET last_used_at = now(), device_name = COALESCE(EXCLUDED.device_name, trusted_devices.device_name);
END;
$$;

-- Function to remove a trusted device on logout
CREATE OR REPLACE FUNCTION public.remove_trusted_device(
  _user_id UUID,
  _device_fingerprint TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.trusted_devices
  WHERE user_id = _user_id AND device_fingerprint = _device_fingerprint;
END;
$$;
