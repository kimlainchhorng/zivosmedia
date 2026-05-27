-- Create enums for renter verification
CREATE TYPE renter_verification_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE renter_document_type AS ENUM ('license_front', 'license_back', 'selfie');

-- Create renter_profiles table
CREATE TABLE public.renter_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  license_number TEXT NOT NULL,
  license_state TEXT NOT NULL CHECK (length(license_state) = 2),
  license_expiration DATE NOT NULL,
  verification_status renter_verification_status DEFAULT 'pending',
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create renter_documents table
CREATE TABLE public.renter_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id UUID REFERENCES public.renter_profiles(id) ON DELETE CASCADE NOT NULL,
  document_type renter_document_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  status renter_verification_status DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(renter_id, document_type)
);

-- Enable RLS
ALTER TABLE public.renter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.renter_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for renter_profiles
CREATE POLICY "Users can view own renter profile"
  ON public.renter_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own renter profile"
  ON public.renter_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own renter profile"
  ON public.renter_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin full access to renter profiles"
  ON public.renter_profiles FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for renter_documents
CREATE POLICY "Users can view own renter documents"
  ON public.renter_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.renter_profiles rp 
    WHERE rp.id = renter_documents.renter_id 
    AND rp.user_id = auth.uid()
  ));

CREATE POLICY "Users can upload own renter documents"
  ON public.renter_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.renter_profiles rp 
    WHERE rp.id = renter_documents.renter_id 
    AND rp.user_id = auth.uid()
  ));

CREATE POLICY "Admin full access to renter documents"
  ON public.renter_documents FOR ALL
  USING (public.is_admin(auth.uid()));

-- Helper function to check if user is verified renter
CREATE OR REPLACE FUNCTION public.is_verified_renter(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM renter_profiles 
    WHERE user_id = user_uuid 
    AND verification_status = 'approved'
    AND license_expiration > CURRENT_DATE
  );
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_renter_profiles_updated_at
  BEFORE UPDATE ON public.renter_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();