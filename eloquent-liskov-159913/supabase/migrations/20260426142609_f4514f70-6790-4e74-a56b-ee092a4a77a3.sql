ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_text text,
  ADD COLUMN IF NOT EXISTS forwarded_from_user_id uuid,
  ADD COLUMN IF NOT EXISTS forwarded_from_message_id uuid;

CREATE OR REPLACE FUNCTION public.enforce_dm_edit_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.edited_at IS NOT NULL
     AND OLD.edited_at IS DISTINCT FROM NEW.edited_at
     AND OLD.created_at < (now() - interval '48 hours') THEN
    RAISE EXCEPTION 'Message is too old to edit (48h limit)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_dm_edit_window ON public.direct_messages;
CREATE TRIGGER trg_enforce_dm_edit_window
BEFORE UPDATE ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.enforce_dm_edit_window();