-- ============ TRAINING PROGRAMS ============
CREATE TABLE public.store_training_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'training' CHECK (type IN ('onboarding','training','certification')),
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_training_programs_store ON public.store_training_programs(store_id);
ALTER TABLE public.store_training_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view training programs"
  ON public.store_training_programs FOR SELECT TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()));
CREATE POLICY "Managers can create training programs"
  ON public.store_training_programs FOR INSERT TO authenticated
  WITH CHECK (public.is_lodge_store_manager(store_id, auth.uid()));
CREATE POLICY "Managers can update training programs"
  ON public.store_training_programs FOR UPDATE TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()))
  WITH CHECK (public.is_lodge_store_manager(store_id, auth.uid()));
CREATE POLICY "Managers can delete training programs"
  ON public.store_training_programs FOR DELETE TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()));

CREATE TRIGGER trg_training_programs_updated_at
  BEFORE UPDATE ON public.store_training_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TRAINING MODULES ============
CREATE TABLE public.store_training_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.store_training_programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_training_modules_program ON public.store_training_modules(program_id);
ALTER TABLE public.store_training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view training modules"
  ON public.store_training_modules FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_training_programs p
    WHERE p.id = program_id AND public.is_lodge_store_manager(p.store_id, auth.uid())
  ));
CREATE POLICY "Managers can manage training modules"
  ON public.store_training_modules FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_training_programs p
    WHERE p.id = program_id AND public.is_lodge_store_manager(p.store_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.store_training_programs p
    WHERE p.id = program_id AND public.is_lodge_store_manager(p.store_id, auth.uid())
  ));

CREATE TRIGGER trg_training_modules_updated_at
  BEFORE UPDATE ON public.store_training_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ TRAINING ASSIGNMENTS ============
CREATE TABLE public.store_training_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.store_training_programs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.store_employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','in_progress','completed')),
  progress_pct INT NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (program_id, employee_id)
);
CREATE INDEX idx_training_assignments_program ON public.store_training_assignments(program_id);
CREATE INDEX idx_training_assignments_employee ON public.store_training_assignments(employee_id);
ALTER TABLE public.store_training_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view training assignments"
  ON public.store_training_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_training_programs p
    WHERE p.id = program_id AND public.is_lodge_store_manager(p.store_id, auth.uid())
  ));
CREATE POLICY "Managers can manage training assignments"
  ON public.store_training_assignments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_training_programs p
    WHERE p.id = program_id AND public.is_lodge_store_manager(p.store_id, auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.store_training_programs p
    WHERE p.id = program_id AND public.is_lodge_store_manager(p.store_id, auth.uid())
  ));

CREATE TRIGGER trg_training_assignments_updated_at
  BEFORE UPDATE ON public.store_training_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ DOCUMENTS ============
CREATE TABLE public.store_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.store_employees(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'pdf',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','pending')),
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_store_documents_store ON public.store_documents(store_id);
CREATE INDEX idx_store_documents_employee ON public.store_documents(employee_id);
ALTER TABLE public.store_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view documents"
  ON public.store_documents FOR SELECT TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()));
CREATE POLICY "Managers can create documents"
  ON public.store_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_lodge_store_manager(store_id, auth.uid()));
CREATE POLICY "Managers can update documents"
  ON public.store_documents FOR UPDATE TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()))
  WITH CHECK (public.is_lodge_store_manager(store_id, auth.uid()));
CREATE POLICY "Managers can delete documents"
  ON public.store_documents FOR DELETE TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()));

CREATE TRIGGER trg_store_documents_updated_at
  BEFORE UPDATE ON public.store_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-documents',
  'store-documents',
  false,
  52428800,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/heic','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: path = {store_id}/{document_id}/{filename}
CREATE POLICY "Managers can read store documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'store-documents'
    AND public.is_lodge_store_manager(((storage.foldername(name))[1])::uuid, auth.uid())
  );
CREATE POLICY "Managers can upload store documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'store-documents'
    AND public.is_lodge_store_manager(((storage.foldername(name))[1])::uuid, auth.uid())
  );
CREATE POLICY "Managers can delete store documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'store-documents'
    AND public.is_lodge_store_manager(((storage.foldername(name))[1])::uuid, auth.uid())
  );