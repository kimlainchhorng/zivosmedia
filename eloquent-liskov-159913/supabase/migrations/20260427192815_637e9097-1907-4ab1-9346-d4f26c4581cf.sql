ALTER TABLE public.lodging_concierge_tasks
  ADD COLUMN IF NOT EXISTS source_message_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_lodging_concierge_tasks_source_message
  ON public.lodging_concierge_tasks(source_message_id)
  WHERE source_message_id IS NOT NULL;