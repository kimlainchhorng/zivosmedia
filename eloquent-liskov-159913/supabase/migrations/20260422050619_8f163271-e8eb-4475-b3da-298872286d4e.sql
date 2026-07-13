ALTER TABLE public.lodge_rooms
  ADD COLUMN IF NOT EXISTS cover_photo_index integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.lodge_reservation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.lodge_reservations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  note text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lodge_reservation_audit_reservation
  ON public.lodge_reservation_audit (reservation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lodge_reservation_audit_store
  ON public.lodge_reservation_audit (store_id, created_at DESC);

ALTER TABLE public.lodge_reservation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit visible to store owner or admin"
ON public.lodge_reservation_audit
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = lodge_reservation_audit.store_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Audit insert by store owner or admin"
ON public.lodge_reservation_audit
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = lodge_reservation_audit.store_id
        AND r.owner_id = auth.uid()
    )
  )
);