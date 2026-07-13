-- Lodge laundry: track laundry and dry cleaning orders per room
CREATE TABLE IF NOT EXISTS public.lodge_laundry_orders (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  room_number      text        NOT NULL,
  guest_name       text,
  service_type     text        NOT NULL DEFAULT 'standard'
                               CHECK (service_type IN ('standard','express','dry_cleaning','pressing','ironing')),
  bag_count        int         NOT NULL DEFAULT 1,
  items_desc       text,
  status           text        NOT NULL DEFAULT 'collected'
                               CHECK (status IN ('collected','processing','ready','delivered','cancelled')),
  total_cents      int         NOT NULL DEFAULT 0,
  collected_at     timestamptz NOT NULL DEFAULT now(),
  ready_by         date,
  delivered_at     timestamptz,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lodge_laundry_store_idx
  ON public.lodge_laundry_orders (store_id, created_at DESC);

CREATE TRIGGER trg_lodge_laundry_updated
  BEFORE UPDATE ON public.lodge_laundry_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lodge_laundry_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage laundry orders"
ON public.lodge_laundry_orders FOR ALL TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
