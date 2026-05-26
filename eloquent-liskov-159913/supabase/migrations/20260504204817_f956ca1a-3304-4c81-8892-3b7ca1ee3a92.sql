
DO $$ BEGIN
  CREATE TYPE public.marketplace_source_platform AS ENUM ('taobao','lazada','1688','shein','manual','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_fulfillment_status AS ENUM (
    'awaiting_payment','awaiting_supplier','supplier_ordered','at_origin_warehouse',
    'in_transit','at_local_warehouse','out_for_delivery','delivered','cancelled','refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.marketplace_payment_method AS ENUM ('card','aba','cash_on_delivery','wallet');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE POLICY "Warehouses viewable by everyone" ON public.warehouses FOR SELECT USING (true);
CREATE POLICY "Admins manage warehouses" ON public.warehouses FOR ALL USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.warehouses(name, country, city, address, lat, lng)
SELECT 'ZIVO Phnom Penh Warehouse','KH','Phnom Penh','Phnom Penh, Cambodia',11.5564,104.9282
WHERE NOT EXISTS (SELECT 1 FROM public.warehouses WHERE country='KH');
