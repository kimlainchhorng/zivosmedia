ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS file_payload jsonb;

ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS file_payload jsonb;