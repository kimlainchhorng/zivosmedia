-- Lodge parking: manage parking slots and guest vehicle assignments
CREATE TABLE IF NOT EXISTS public.lodge_parking_slots (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  slot_number       text        NOT NULL,
  slot_type         text        NOT NULL DEFAULT 'standard'
                                CHECK (slot_type IN ('standard','compact','disabled','valet','ev')),
  status            text        NOT NULL DEFAULT 'available'
                                CHECK (status IN ('available','occupied','reserved','maintenance')),
  vehicle_plate     text,
  vehicle_model     text,
  vehicle_color     text,
  guest_name        text,
  reservation_id    uuid,
  parked_at         timestamptz,
  expected_out      date,
  fee_per_day_cents int         NOT NULL DEFAULT 0,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, slot_number)
);

CREATE INDEX IF NOT EXISTS lodge_parking_store_idx
  ON public.lodge_parking_slots (store_id, status);

CREATE TRIGGER trg_lodge_parking_updated
  BEFORE UPDATE ON public.lodge_parking_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lodge_parking_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage parking slots"
ON public.lodge_parking_slots
FOR ALL TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
