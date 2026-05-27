
CREATE TABLE IF NOT EXISTS public.marketing_qa_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  store_id uuid NOT NULL,
  viewport text NOT NULL,
  results jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.marketing_qa_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS marketing_qa_runs_store_idx ON public.marketing_qa_runs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_qa_runs_admin_idx ON public.marketing_qa_runs(admin_id, created_at DESC);

CREATE POLICY "Admins read marketing_qa_runs"
  ON public.marketing_qa_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert marketing_qa_runs"
  ON public.marketing_qa_runs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

CREATE POLICY "Admins delete own marketing_qa_runs"
  ON public.marketing_qa_runs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());
