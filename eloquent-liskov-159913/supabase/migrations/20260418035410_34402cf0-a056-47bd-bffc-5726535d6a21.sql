
-- Enable trigram extension for fast text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- 1) CAREER COMPANIES
-- ============================================
CREATE TABLE public.career_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  industry TEXT,
  description TEXT,
  website TEXT,
  location TEXT,
  city TEXT,
  country TEXT,
  logo_url TEXT,
  cover_url TEXT,
  size_range TEXT,
  founded_year INT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  contact_email TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_companies_owner ON public.career_companies(owner_id);
CREATE INDEX idx_career_companies_active ON public.career_companies(is_active) WHERE is_active = true;
CREATE INDEX idx_career_companies_name_trgm ON public.career_companies USING gin (name gin_trgm_ops);

ALTER TABLE public.career_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active career companies"
ON public.career_companies FOR SELECT
USING (is_active = true OR auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can create career companies"
ON public.career_companies FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = owner_id
  AND (public.has_role(auth.uid(), 'business_user') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Owner or admin can update career company"
ON public.career_companies FOR UPDATE TO authenticated
USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner or admin can delete career company"
ON public.career_companies FOR DELETE TO authenticated
USING (auth.uid() = owner_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_career_companies_updated_at
BEFORE UPDATE ON public.career_companies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================
-- 2) CAREER JOBS
-- ============================================
CREATE TABLE public.career_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.career_companies(id) ON DELETE CASCADE,
  posted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  employment_type TEXT,
  experience_level TEXT,
  location TEXT,
  is_remote BOOLEAN NOT NULL DEFAULT false,
  salary_min NUMERIC,
  salary_max NUMERIC,
  salary_currency TEXT DEFAULT 'USD',
  skills TEXT[],
  status TEXT NOT NULL DEFAULT 'open',
  applications_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_jobs_company ON public.career_jobs(company_id);
CREATE INDEX idx_career_jobs_status ON public.career_jobs(status);
CREATE INDEX idx_career_jobs_created ON public.career_jobs(created_at DESC);
CREATE INDEX idx_career_jobs_title_trgm ON public.career_jobs USING gin (title gin_trgm_ops);

ALTER TABLE public.career_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open career jobs"
ON public.career_jobs FOR SELECT
USING (
  status = 'open'
  OR auth.uid() = posted_by
  OR EXISTS (SELECT 1 FROM public.career_companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Company owner can create career jobs"
ON public.career_jobs FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = posted_by
  AND (
    EXISTS (SELECT 1 FROM public.career_companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  )
  AND (public.has_role(auth.uid(), 'business_user') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Company owner can update career jobs"
ON public.career_jobs FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.career_companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.career_companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Company owner can delete career jobs"
ON public.career_jobs FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.career_companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

CREATE TRIGGER trg_career_jobs_updated_at
BEFORE UPDATE ON public.career_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================
-- 3) CAREER APPLICATIONS
-- ============================================
CREATE TABLE public.career_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.career_jobs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_id UUID REFERENCES public.user_cvs(id) ON DELETE SET NULL,
  resume_url TEXT,
  cover_note TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  applicant_email TEXT,
  applicant_phone TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, applicant_id)
);

CREATE INDEX idx_career_applications_job ON public.career_applications(job_id);
CREATE INDEX idx_career_applications_applicant ON public.career_applications(applicant_id);
CREATE INDEX idx_career_applications_status ON public.career_applications(status);

ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can view own career applications"
ON public.career_applications FOR SELECT TO authenticated
USING (auth.uid() = applicant_id);

CREATE POLICY "Company owner can view applications to their career jobs"
ON public.career_applications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.career_jobs j
    JOIN public.career_companies c ON c.id = j.company_id
    WHERE j.id = job_id AND c.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can submit career applications"
ON public.career_applications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = applicant_id
  AND EXISTS (SELECT 1 FROM public.career_jobs j WHERE j.id = job_id AND j.status = 'open')
);

CREATE POLICY "Applicant can update own career application"
ON public.career_applications FOR UPDATE TO authenticated
USING (auth.uid() = applicant_id)
WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Company owner can update career applications"
ON public.career_applications FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.career_jobs j
    JOIN public.career_companies c ON c.id = j.company_id
    WHERE j.id = job_id AND c.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.career_jobs j
    JOIN public.career_companies c ON c.id = j.company_id
    WHERE j.id = job_id AND c.owner_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Applicant can delete own career application"
ON public.career_applications FOR DELETE TO authenticated
USING (auth.uid() = applicant_id);

CREATE TRIGGER trg_career_applications_updated_at
BEFORE UPDATE ON public.career_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.bump_career_applications_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.career_jobs SET applications_count = applications_count + 1 WHERE id = NEW.job_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.career_jobs SET applications_count = GREATEST(applications_count - 1, 0) WHERE id = OLD.job_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_bump_career_applications_count
AFTER INSERT OR DELETE ON public.career_applications
FOR EACH ROW EXECUTE FUNCTION public.bump_career_applications_count();


-- ============================================
-- 4) STORAGE BUCKET for resume PDFs
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-resumes', 'job-resumes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Applicants can upload career resumes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'job-resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Applicants can read own career resumes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Company owners can read applicant career resumes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-resumes'
  AND EXISTS (
    SELECT 1
    FROM public.career_applications a
    JOIN public.career_jobs j ON j.id = a.job_id
    JOIN public.career_companies c ON c.id = j.company_id
    WHERE a.resume_url LIKE '%' || storage.objects.name
      AND c.owner_id = auth.uid()
  )
);

CREATE POLICY "Applicants can delete own career resumes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'job-resumes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can read all career resumes"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'job-resumes'
  AND public.has_role(auth.uid(), 'admin')
);
