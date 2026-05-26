CREATE TABLE public.clock_qr_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.store_employees(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('store', 'employee')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_clock_qr_tokens_token ON public.clock_qr_tokens(token);
CREATE INDEX idx_clock_qr_tokens_store ON public.clock_qr_tokens(store_id, token_type, expires_at);
CREATE INDEX idx_clock_qr_tokens_employee ON public.clock_qr_tokens(employee_id, token_type, expires_at);

ALTER TABLE public.clock_qr_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage store tokens"
  ON public.clock_qr_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = clock_qr_tokens.store_id
      AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = clock_qr_tokens.store_id
      AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "Employees can manage own tokens"
  ON public.clock_qr_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_employees se
      WHERE se.id = clock_qr_tokens.employee_id
      AND se.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_employees se
      WHERE se.id = clock_qr_tokens.employee_id
      AND se.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can read store tokens"
  ON public.clock_qr_tokens
  FOR SELECT
  TO authenticated
  USING (
    token_type = 'store'
    AND EXISTS (
      SELECT 1 FROM public.store_employees se
      WHERE se.store_id = clock_qr_tokens.store_id
      AND se.user_id = auth.uid()
      AND se.status = 'active'
    )
  );

CREATE OR REPLACE FUNCTION public.cleanup_expired_qr_tokens()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.clock_qr_tokens WHERE expires_at < now() - interval '1 hour';
$$;