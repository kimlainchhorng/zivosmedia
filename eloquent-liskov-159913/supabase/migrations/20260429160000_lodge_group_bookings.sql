-- Lodge group bookings: manage room blocks for weddings, corporate events, tour groups
CREATE TABLE IF NOT EXISTS public.lodge_group_bookings (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  group_name      text        NOT NULL,
  organizer_name  text,
  organizer_email text,
  organizer_phone text,
  event_type      text        NOT NULL DEFAULT 'other'
                              CHECK (event_type IN ('wedding', 'corporate', 'tour', 'conference', 'school', 'other')),
  check_in        date        NOT NULL,
  check_out       date        NOT NULL,
  room_count      int         NOT NULL DEFAULT 1,
  negotiated_rate_cents int   NOT NULL DEFAULT 0,
  deposit_cents   int         NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'tentative'
                              CHECK (status IN ('tentative', 'confirmed', 'cancelled')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lodge_group_bookings_store_idx
  ON public.lodge_group_bookings (store_id, check_in DESC);

CREATE TRIGGER trg_lodge_group_bookings_updated
  BEFORE UPDATE ON public.lodge_group_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lodge_group_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and staff can manage group bookings"
ON public.lodge_group_bookings
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
