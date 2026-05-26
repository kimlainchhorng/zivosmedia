-- Lodge inventory: track hotel supplies, linens, amenities, F&B stock
CREATE TABLE IF NOT EXISTS public.lodge_inventory_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name                text        NOT NULL,
  category            text        NOT NULL DEFAULT 'housekeeping'
                                  CHECK (category IN (
                                    'housekeeping','linen','amenities','fob_keys',
                                    'fb_supplies','maintenance','office','other'
                                  )),
  unit                text        NOT NULL DEFAULT 'pcs',
  quantity_in_stock   numeric     NOT NULL DEFAULT 0,
  reorder_threshold   numeric     NOT NULL DEFAULT 5,
  unit_cost_cents     int         NOT NULL DEFAULT 0,
  supplier            text,
  last_restocked_at   timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lodge_inventory_store_idx
  ON public.lodge_inventory_items (store_id, category);

CREATE TRIGGER trg_lodge_inventory_updated
  BEFORE UPDATE ON public.lodge_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lodge_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage hotel inventory"
ON public.lodge_inventory_items
FOR ALL TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
