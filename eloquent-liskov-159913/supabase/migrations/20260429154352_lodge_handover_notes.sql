-- Lodge shift handover notes: front-desk staff leave notes for incoming shifts
CREATE TABLE IF NOT EXISTS public.lodge_handover_notes (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  author_name text,
  shift       text        NOT NULL DEFAULT 'morning'
                          CHECK (shift IN ('morning', 'afternoon', 'night')),
  note_date   date        NOT NULL DEFAULT CURRENT_DATE,
  priority    text        NOT NULL DEFAULT 'info'
                          CHECK (priority IN ('info', 'important', 'urgent', 'vip')),
  body        text        NOT NULL,
  resolved    boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lodge_handover_notes_store_date_idx
  ON public.lodge_handover_notes (store_id, note_date DESC);

ALTER TABLE public.lodge_handover_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and staff can manage handover notes"
ON public.lodge_handover_notes
FOR ALL
TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
