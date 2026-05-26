
-- Table
CREATE TABLE public.customer_identity_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  id_document_url text,
  selfie_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.customer_identity_verifications ENABLE ROW LEVEL SECURITY;

-- Customer can read/write own record
CREATE POLICY "Users can view own verification"
  ON public.customer_identity_verifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own verification"
  ON public.customer_identity_verifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own verification"
  ON public.customer_identity_verifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Admin access
CREATE POLICY "Admins can view all verifications"
  ON public.customer_identity_verifications FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update verifications"
  ON public.customer_identity_verifications FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_customer_identity_verifications_updated_at
  BEFORE UPDATE ON public.customer_identity_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('identity-documents', 'identity-documents', false);

CREATE POLICY "Users upload own identity docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users view own identity docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own identity docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
