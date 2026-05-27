-- Lodge wake-up calls: schedule and track morning wake-up call requests per room
CREATE TABLE IF NOT EXISTS public.lodge_wakeup_calls (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  room_number    text        NOT NULL,
  guest_name     text,
  call_date      date        NOT NULL DEFAULT CURRENT_DATE,
  call_time      time        NOT NULL,
  repeat_daily   boolean     NOT NULL DEFAULT false,
  status         text        NOT NULL DEFAULT 'scheduled'
                             CHECK (status IN ('scheduled','completed','missed','cancelled')),
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lodge_wakeup_store_date_idx
  ON public.lodge_wakeup_calls (store_id, call_date, call_time);

ALTER TABLE public.lodge_wakeup_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage wake-up calls"
ON public.lodge_wakeup_calls FOR ALL TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
