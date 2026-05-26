CREATE TABLE public.suggestion_dismissals (
  user_id UUID NOT NULL,
  dismissed_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, dismissed_user_id)
);
ALTER TABLE public.suggestion_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages dismissals" ON public.suggestion_dismissals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_suggestion_dismissals_user ON public.suggestion_dismissals(user_id);