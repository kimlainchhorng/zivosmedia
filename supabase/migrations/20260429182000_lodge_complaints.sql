-- Lodge complaints: in-house guest complaint and feedback resolution log
CREATE TABLE IF NOT EXISTS public.lodge_complaints (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  room_number       text,
  guest_name        text,
  reservation_id    uuid,
  category          text        NOT NULL DEFAULT 'service'
                                CHECK (category IN (
                                  'cleanliness','noise','service','maintenance',
                                  'food','billing','safety','other'
                                )),
  priority          text        NOT NULL DEFAULT 'medium'
                                CHECK (priority IN ('low','medium','high','urgent')),
  description       text        NOT NULL,
  status            text        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open','in_progress','resolved','escalated','closed')),
  assigned_to       text,
  resolution_notes  text,
  resolved_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lodge_complaints_store_idx
  ON public.lodge_complaints (store_id, status, priority);

CREATE TRIGGER trg_lodge_complaints_updated
  BEFORE UPDATE ON public.lodge_complaints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lodge_complaints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage guest complaints"
ON public.lodge_complaints FOR ALL TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
