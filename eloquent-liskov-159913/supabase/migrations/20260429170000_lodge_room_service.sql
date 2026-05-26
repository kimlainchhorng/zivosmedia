-- Lodge room service orders: in-room dining and F&B requests per room
CREATE TABLE IF NOT EXISTS public.lodge_room_service_orders (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  room_number     text        NOT NULL,
  guest_name      text,
  reservation_id  uuid,
  items           text        NOT NULL,
  notes           text,
  status          text        NOT NULL DEFAULT 'placed'
                              CHECK (status IN ('placed','preparing','on_the_way','delivered','cancelled')),
  runner_name     text,
  total_cents     int         NOT NULL DEFAULT 0,
  delivered_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lodge_room_service_store_idx
  ON public.lodge_room_service_orders (store_id, created_at DESC);

CREATE TRIGGER trg_lodge_room_service_updated
  BEFORE UPDATE ON public.lodge_room_service_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lodge_room_service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage room service orders"
ON public.lodge_room_service_orders
FOR ALL TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
