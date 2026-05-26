
-- Create user_cvs table for storing CV/resume data
CREATE TABLE public.user_cvs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  location TEXT,
  summary TEXT,
  job_title TEXT,
  website TEXT,
  linkedin TEXT,
  portfolio TEXT,
  experiences JSONB DEFAULT '[]'::jsonb,
  educations JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  references_list JSONB DEFAULT '[]'::jsonb,
  hobbies TEXT,
  template TEXT DEFAULT 'classic',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_cvs ENABLE ROW LEVEL SECURITY;

-- Users can view their own CVs
CREATE POLICY "Users can view their own CVs"
ON public.user_cvs FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own CVs
CREATE POLICY "Users can create their own CVs"
ON public.user_cvs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own CVs
CREATE POLICY "Users can update their own CVs"
ON public.user_cvs FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own CVs
CREATE POLICY "Users can delete their own CVs"
ON public.user_cvs FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_cvs_updated_at
BEFORE UPDATE ON public.user_cvs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast lookup
CREATE INDEX idx_user_cvs_user_id ON public.user_cvs(user_id);
