-- Cafe bundle/combo items. The "Coffee + Croissant for $6" pattern: header
-- carries the bundled price + presentation fields, the lines reference
-- existing menu items so the kitchen still sees the canonical names + the
-- recipe auto-deducts inventory correctly.

CREATE TABLE IF NOT EXISTS public.cafe_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cafe_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.cafe_bundles(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.cafe_menu_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_bundles_store_idx ON public.cafe_bundles(store_id, sort_order);
CREATE INDEX IF NOT EXISTS cafe_bundle_items_bundle_idx ON public.cafe_bundle_items(bundle_id);

ALTER TABLE public.cafe_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_bundle_items ENABLE ROW LEVEL SECURITY;

-- Public can read active bundles so the customer order page works without
-- auth. Owner manages everything.
DROP POLICY IF EXISTS cafe_bundles_select_all ON public.cafe_bundles;
CREATE POLICY cafe_bundles_select_all ON public.cafe_bundles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS cafe_bundles_owner_manage ON public.cafe_bundles;
CREATE POLICY cafe_bundles_owner_manage ON public.cafe_bundles
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.store_profiles s WHERE s.id = cafe_bundles.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles s WHERE s.id = cafe_bundles.store_id AND s.owner_id = auth.uid()));

DROP POLICY IF EXISTS cafe_bundle_items_select_all ON public.cafe_bundle_items;
CREATE POLICY cafe_bundle_items_select_all ON public.cafe_bundle_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS cafe_bundle_items_owner_manage ON public.cafe_bundle_items;
CREATE POLICY cafe_bundle_items_owner_manage ON public.cafe_bundle_items
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.cafe_bundles b
    JOIN public.store_profiles s ON s.id = b.store_id
    WHERE b.id = cafe_bundle_items.bundle_id AND s.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cafe_bundles b
    JOIN public.store_profiles s ON s.id = b.store_id
    WHERE b.id = cafe_bundle_items.bundle_id AND s.owner_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.cafe_bundles_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS cafe_bundles_touch ON public.cafe_bundles;
CREATE TRIGGER cafe_bundles_touch
  BEFORE UPDATE ON public.cafe_bundles
  FOR EACH ROW EXECUTE FUNCTION public.cafe_bundles_touch_updated_at();
