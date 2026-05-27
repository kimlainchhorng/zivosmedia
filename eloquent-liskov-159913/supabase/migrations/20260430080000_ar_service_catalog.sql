-- Auto Repair — Service Catalog / Price Book
-- Shop-defined standard services with labor + parts presets for quick estimate entry.

CREATE TABLE IF NOT EXISTS public.ar_service_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  description text,
  labor_hours numeric(5,2) NOT NULL DEFAULT 0,
  labor_rate_cents integer NOT NULL DEFAULT 0,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_service_catalog_store
  ON public.ar_service_catalog(store_id, category);

ALTER TABLE public.ar_service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their ar_service_catalog"
  ON public.ar_service_catalog FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = ar_service_catalog.store_id AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = ar_service_catalog.store_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Admins manage all ar_service_catalog"
  ON public.ar_service_catalog FOR ALL
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE TRIGGER update_ar_service_catalog_updated_at
  BEFORE UPDATE ON public.ar_service_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
