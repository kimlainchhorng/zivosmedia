
-- Add share_code and photo_url columns to user_cvs
ALTER TABLE public.user_cvs 
ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create a function to generate random share codes
CREATE OR REPLACE FUNCTION public.generate_cv_share_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.share_code IS NULL THEN
    NEW.share_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate share code on insert
CREATE TRIGGER trg_cv_share_code
BEFORE INSERT ON public.user_cvs
FOR EACH ROW
EXECUTE FUNCTION public.generate_cv_share_code();

-- Allow public read access by share_code
CREATE POLICY "Anyone can view shared CVs by share_code"
ON public.user_cvs FOR SELECT
USING (share_code IS NOT NULL);

-- Create storage bucket for CV photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-photos', 'cv-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for cv-photos
CREATE POLICY "CV photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'cv-photos');

CREATE POLICY "Users can upload their own CV photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'cv-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own CV photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'cv-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CV photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'cv-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
