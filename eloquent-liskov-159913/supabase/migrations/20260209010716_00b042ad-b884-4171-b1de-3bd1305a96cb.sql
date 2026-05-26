-- Add missing columns to kyc_submissions
ALTER TABLE public.kyc_submissions 
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS completed_steps INTEGER[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS personal_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS info_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS info_request_message TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Rename reviewed_by_admin_id to reviewed_by if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kyc_submissions' AND column_name = 'reviewed_by_admin_id') THEN
    ALTER TABLE public.kyc_submissions RENAME COLUMN reviewed_by_admin_id TO reviewed_by;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add missing column to kyc_events
ALTER TABLE public.kyc_events 
ADD COLUMN IF NOT EXISTS submission_id UUID REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status ON public.kyc_submissions(status);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_role ON public.kyc_submissions(role);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user ON public.kyc_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_submitted ON public.kyc_submissions(submitted_at);
CREATE INDEX IF NOT EXISTS idx_kyc_events_submission ON public.kyc_events(submission_id);
CREATE INDEX IF NOT EXISTS idx_kyc_events_user ON public.kyc_events(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_events_type ON public.kyc_events(event_type);

-- Enable RLS
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view own kyc submission" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users can insert own kyc submission" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users can update own draft kyc submission" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins can view all kyc submissions" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Admins can update any kyc submission" ON public.kyc_submissions;
DROP POLICY IF EXISTS "Users can view own kyc events" ON public.kyc_events;
DROP POLICY IF EXISTS "Admins can view all kyc events" ON public.kyc_events;
DROP POLICY IF EXISTS "Authenticated can insert kyc events" ON public.kyc_events;

-- Recreate policies for kyc_submissions
CREATE POLICY "Users can view own kyc submission"
ON public.kyc_submissions FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own kyc submission"
ON public.kyc_submissions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own draft kyc submission"
ON public.kyc_submissions FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status IN ('draft', 'needs_info'));

CREATE POLICY "Admins can view all kyc submissions"
ON public.kyc_submissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any kyc submission"
ON public.kyc_submissions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Recreate policies for kyc_events
CREATE POLICY "Users can view own kyc events"
ON public.kyc_events FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all kyc events"
ON public.kyc_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can insert kyc events"
ON public.kyc_events FOR INSERT TO authenticated
WITH CHECK (true);

-- Create kyc-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents', 
  'kyc-documents', 
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload own kyc docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own kyc docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all kyc docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own kyc docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own kyc docs" ON storage.objects;

CREATE POLICY "Users can upload own kyc docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own kyc docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all kyc docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update own kyc docs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own kyc docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_kyc_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_kyc_submissions_updated_at ON public.kyc_submissions;
CREATE TRIGGER trigger_kyc_submissions_updated_at
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_kyc_submissions_updated_at();