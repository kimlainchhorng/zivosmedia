-- 1) Drop dependent policies first, then the column
DROP POLICY IF EXISTS "Store owners read assigned vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Store owners update assigned vehicles" ON public.vehicles;
ALTER TABLE public.vehicles DROP COLUMN IF EXISTS assigned_store_id;

-- ============ ar_customer_vehicles ============
CREATE TABLE public.ar_customer_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  owner_name text NOT NULL,
  owner_phone text,
  owner_email text,
  year integer,
  make text NOT NULL,
  model text NOT NULL,
  vin text,
  plate text,
  color text,
  mileage integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_cust_vehicles_store ON public.ar_customer_vehicles(store_id);
CREATE INDEX idx_ar_cust_vehicles_search ON public.ar_customer_vehicles(store_id, owner_name, plate);

ALTER TABLE public.ar_customer_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their ar_customer_vehicles"
ON public.ar_customer_vehicles FOR ALL
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ar_customer_vehicles.store_id AND r.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ar_customer_vehicles.store_id AND r.owner_id = auth.uid()));

CREATE POLICY "Admins manage all ar_customer_vehicles"
ON public.ar_customer_vehicles FOR ALL
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE TRIGGER update_ar_customer_vehicles_updated_at
BEFORE UPDATE ON public.ar_customer_vehicles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ar_inspections ============
CREATE TABLE public.ar_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  customer_vehicle_id uuid REFERENCES public.ar_customer_vehicles(id) ON DELETE SET NULL,
  vehicle_label text,
  technician_id uuid,
  technician_name text,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','sent','archived')),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text,
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_inspections_store_created ON public.ar_inspections(store_id, created_at DESC);
CREATE INDEX idx_ar_inspections_share ON public.ar_inspections(share_token);

ALTER TABLE public.ar_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their ar_inspections"
ON public.ar_inspections FOR ALL
USING (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ar_inspections.store_id AND r.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.restaurants r WHERE r.id = ar_inspections.store_id AND r.owner_id = auth.uid()));

CREATE POLICY "Admins manage all ar_inspections"
ON public.ar_inspections FOR ALL
USING (has_role(auth.uid(), 'admin'::text))
WITH CHECK (has_role(auth.uid(), 'admin'::text));

CREATE TRIGGER update_ar_inspections_updated_at
BEFORE UPDATE ON public.ar_inspections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();