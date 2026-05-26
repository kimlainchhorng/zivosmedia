
DROP FUNCTION IF EXISTS public.admin_clear_customer_phone(uuid);

CREATE OR REPLACE FUNCTION public.admin_clear_customer_phone(_customer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  UPDATE public.profiles
  SET phone = NULL,
      phone_e164 = NULL,
      phone_verified = false,
      phone_verified_at = NULL
  WHERE id = _customer_id;
END;
$$;
