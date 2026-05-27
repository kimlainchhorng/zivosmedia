-- Create system-backups storage bucket for backup files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('system-backups', 'system-backups', false, 1073741824)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only admins can read system backups
CREATE POLICY "Admins can read system backups"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'system-backups' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS: Only admins can upload to system backups
CREATE POLICY "Admins can upload system backups"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'system-backups' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS: Only admins can delete system backups
CREATE POLICY "Admins can delete system backups"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'system-backups' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Add expires_at column to backup_logs if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'backup_logs' 
    AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.backup_logs ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add triggered_by column to backup_logs if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'backup_logs' 
    AND column_name = 'triggered_by'
  ) THEN
    ALTER TABLE public.backup_logs ADD COLUMN triggered_by TEXT;
  END IF;
END $$;