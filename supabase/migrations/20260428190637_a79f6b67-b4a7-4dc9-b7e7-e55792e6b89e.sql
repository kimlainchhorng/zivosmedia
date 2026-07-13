-- ============ ar_parts ============
CREATE TABLE public.ar_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  sku text NOT NULL,
  name text NOT NULL,
  brand text,
  category text,
  price_cents integer NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, sku)
);
CREATE INDEX idx_ar_parts_store ON public.ar_parts(store_id);
CREATE INDEX idx_ar_parts_category ON public.ar_parts(store_id, category);

ALTER TABLE public.ar_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active parts are viewable by everyone"
ON public.ar_parts FOR SELECT
USING (active = true);

CREATE POLICY "Owners manage their ar_parts"
ON public.ar_parts FOR ALL
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ar_parts.store_id AND r.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ar_parts.store_id AND r.owner_id = auth.uid()));

CREATE POLICY "Admins manage all ar_parts"
ON public.ar_parts FOR ALL
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE TRIGGER update_ar_parts_updated_at
BEFORE UPDATE ON public.ar_parts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ar_vin_lookups ============
CREATE TABLE public.ar_vin_lookups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  vin text NOT NULL,
  decoded jsonb NOT NULL DEFAULT '{}'::jsonb,
  looked_up_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_vin_lookups_store_created ON public.ar_vin_lookups(store_id, created_at DESC);

ALTER TABLE public.ar_vin_lookups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their ar_vin_lookups"
ON public.ar_vin_lookups FOR ALL
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ar_vin_lookups.store_id AND r.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ar_vin_lookups.store_id AND r.owner_id = auth.uid()));

CREATE POLICY "Admins manage all ar_vin_lookups"
ON public.ar_vin_lookups FOR ALL
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

-- ============ vehicles.assigned_store_id ============
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS assigned_store_id uuid;

CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_store ON public.vehicles(assigned_store_id);

CREATE POLICY "Store owners read assigned vehicles"
ON public.vehicles FOR SELECT
USING (
  assigned_store_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = vehicles.assigned_store_id AND r.owner_id = auth.uid())
);

CREATE POLICY "Store owners update assigned vehicles"
ON public.vehicles FOR UPDATE
USING (
  assigned_store_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = vehicles.assigned_store_id AND r.owner_id = auth.uid())
);