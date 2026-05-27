-- Table to store payment method configuration per store
CREATE TABLE public.store_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  provider text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  account_number text,
  account_holder_name text,
  qr_code_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, provider)
);

ALTER TABLE public.store_payment_methods ENABLE ROW LEVEL SECURITY;

-- Table for email OTP verification codes for sensitive payment changes
CREATE TABLE public.payment_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_verification_codes ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can manage payment methods (admin route protected)
CREATE POLICY "Authenticated users can manage payment methods"
  ON public.store_payment_methods
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS: users can manage their own verification codes
CREATE POLICY "Users can manage own verification codes"
  ON public.payment_verification_codes
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_payment_method_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.store_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_method_timestamp();