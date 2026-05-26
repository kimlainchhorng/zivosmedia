-- Super App Architecture
-- 1) Meta Data Bridge tables + webhook triggers
-- 2) Social-to-Sale reel links
-- 3) Truck inventory + offline-ready sales records
-- 4) Employee clock + payroll + merchant ROI

-- ------------------------------
-- Social-to-Sale
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.social_reel_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  post_source TEXT NOT NULL CHECK (post_source IN ('store', 'user')),
  link_type TEXT NOT NULL CHECK (link_type IN ('store_product', 'truck_sale')),
  store_id UUID REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  store_product_id UUID REFERENCES public.store_products(id) ON DELETE CASCADE,
  truck_sale_id UUID,
  checkout_path TEXT,
  map_lat DOUBLE PRECISION,
  map_lng DOUBLE PRECISION,
  map_label TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_social_reel_links_post ON public.social_reel_links(post_id, post_source);
CREATE INDEX IF NOT EXISTS idx_social_reel_links_store_product ON public.social_reel_links(store_product_id);
CREATE INDEX IF NOT EXISTS idx_social_reel_links_truck_sale ON public.social_reel_links(truck_sale_id);

ALTER TABLE public.social_reel_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read social reel links" ON public.social_reel_links;
CREATE POLICY "Anyone can read social reel links"
  ON public.social_reel_links FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create reel links" ON public.social_reel_links;
CREATE POLICY "Authenticated users can create reel links"
  ON public.social_reel_links FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Creators can update own reel links" ON public.social_reel_links;
CREATE POLICY "Creators can update own reel links"
  ON public.social_reel_links FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ------------------------------
-- Truck Inventory + Sales
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.warehouse_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.truck_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  driver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  truck_label TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, driver_user_id, truck_label, product_id)
);

CREATE TABLE IF NOT EXISTS public.truck_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  driver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  truck_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_offline_synced BOOLEAN NOT NULL DEFAULT false,
  transaction_ref TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.truck_sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.truck_sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_truck_sales_store_status ON public.truck_sales(store_id, status);
CREATE INDEX IF NOT EXISTS idx_truck_sales_driver ON public.truck_sales(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_truck_sale_items_sale ON public.truck_sale_items(sale_id);

CREATE TABLE IF NOT EXISTS public.truck_offline_sales_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  driver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
  synced_sale_id UUID REFERENCES public.truck_sales(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ
);

-- ------------------------------
-- Employee Clock + Payroll + ROI
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.employee_clock_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.store_employees(id) ON DELETE CASCADE,
  employee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('clock_in', 'clock_out')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  gps_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_clock_logs_store ON public.employee_clock_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_clock_logs_employee ON public.employee_clock_logs(employee_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.store_payroll_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  base_pay NUMERIC(12,2) NOT NULL DEFAULT 0,
  truck_sales_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  rides_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.merchant_ad_spend (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  spend_amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  spend_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL DEFAULT 'meta_ads',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_ad_spend_store_date ON public.merchant_ad_spend(store_id, spend_date DESC);

CREATE OR REPLACE FUNCTION public.get_merchant_roi(
  p_store_id UUID,
  p_from TIMESTAMPTZ DEFAULT now() - interval '30 days',
  p_to TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(
  store_id UUID,
  ad_spend NUMERIC,
  verified_sales NUMERIC,
  roi_percent NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH spend AS (
    SELECT COALESCE(SUM(ms.spend_amount), 0)::NUMERIC AS ad_spend
    FROM public.merchant_ad_spend ms
    WHERE ms.store_id = p_store_id
      AND ms.spend_date BETWEEN p_from::date AND p_to::date
  ),
  sales AS (
    SELECT (
      COALESCE((
        SELECT SUM(so.total_cents)::NUMERIC / 100
        FROM public.store_orders so
        WHERE so.store_id = p_store_id
          AND so.status = 'delivered'
          AND so.updated_at BETWEEN p_from AND p_to
      ), 0)
      +
      COALESCE((
        SELECT SUM(ts.total_amount)::NUMERIC
        FROM public.truck_sales ts
        WHERE ts.store_id = p_store_id
          AND ts.status = 'completed'
          AND ts.updated_at BETWEEN p_from AND p_to
      ), 0)
    )::NUMERIC AS verified_sales
  )
  SELECT
    p_store_id,
    spend.ad_spend,
    sales.verified_sales,
    CASE
      WHEN spend.ad_spend = 0 THEN 0
      ELSE ROUND(((sales.verified_sales - spend.ad_spend) / spend.ad_spend) * 100, 2)
    END AS roi_percent
  FROM spend, sales;
$$;

CREATE OR REPLACE FUNCTION public.get_employee_payroll_summary(
  p_store_id UUID,
  p_from TIMESTAMPTZ DEFAULT now() - interval '30 days',
  p_to TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(
  employee_id UUID,
  employee_name TEXT,
  base_pay NUMERIC,
  truck_sales_total NUMERIC,
  rides_total NUMERIC,
  commission NUMERIC,
  total_pay NUMERIC,
  currency TEXT
)
LANGUAGE sql
STABLE
AS $$
  WITH cfg AS (
    SELECT
      COALESCE(pc.base_pay, 0) AS base_pay,
      COALESCE(pc.truck_sales_commission_pct, 0) AS truck_pct,
      COALESCE(pc.rides_commission_pct, 0) AS rides_pct,
      COALESCE(pc.currency, 'USD') AS currency
    FROM public.store_payroll_configs pc
    WHERE pc.store_id = p_store_id
    UNION ALL
    SELECT 0, 0, 0, 'USD'
    WHERE NOT EXISTS (SELECT 1 FROM public.store_payroll_configs pc WHERE pc.store_id = p_store_id)
    LIMIT 1
  )
  SELECT
    se.id AS employee_id,
    se.name AS employee_name,
    cfg.base_pay,
    COALESCE((
      SELECT SUM(ts.total_amount)
      FROM public.truck_sales ts
      WHERE ts.store_id = se.store_id
        AND ts.driver_user_id = se.user_id
        AND ts.status = 'completed'
        AND ts.updated_at BETWEEN p_from AND p_to
    ), 0)::NUMERIC AS truck_sales_total,
    COALESCE((
      SELECT SUM(t.fare_amount)
      FROM public.trips t
      JOIN public.drivers d ON d.id = t.driver_id
      WHERE d.user_id = se.user_id
        AND t.status = 'completed'
        AND t.completed_at BETWEEN p_from AND p_to
    ), 0)::NUMERIC AS rides_total,
    (
      COALESCE((
        SELECT SUM(ts.total_amount)
        FROM public.truck_sales ts
        WHERE ts.store_id = se.store_id
          AND ts.driver_user_id = se.user_id
          AND ts.status = 'completed'
          AND ts.updated_at BETWEEN p_from AND p_to
      ), 0)::NUMERIC * (cfg.truck_pct / 100.0)
      +
      COALESCE((
        SELECT SUM(t.fare_amount)
        FROM public.trips t
        JOIN public.drivers d ON d.id = t.driver_id
        WHERE d.user_id = se.user_id
          AND t.status = 'completed'
          AND t.completed_at BETWEEN p_from AND p_to
      ), 0)::NUMERIC * (cfg.rides_pct / 100.0)
    )::NUMERIC AS commission,
    (
      cfg.base_pay
      + (
        COALESCE((
          SELECT SUM(ts.total_amount)
          FROM public.truck_sales ts
          WHERE ts.store_id = se.store_id
            AND ts.driver_user_id = se.user_id
            AND ts.status = 'completed'
            AND ts.updated_at BETWEEN p_from AND p_to
        ), 0)::NUMERIC * (cfg.truck_pct / 100.0)
      )
      + (
        COALESCE((
          SELECT SUM(t.fare_amount)
          FROM public.trips t
          JOIN public.drivers d ON d.id = t.driver_id
          WHERE d.user_id = se.user_id
            AND t.status = 'completed'
            AND t.completed_at BETWEEN p_from AND p_to
        ), 0)::NUMERIC * (cfg.rides_pct / 100.0)
      )
    )::NUMERIC AS total_pay,
    cfg.currency
  FROM public.store_employees se
  CROSS JOIN cfg
  WHERE se.store_id = p_store_id
    AND se.status = 'active';
$$;

-- ------------------------------
-- Meta Data Bridge
-- ------------------------------
CREATE TABLE IF NOT EXISTS public.meta_conversion_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_table TEXT,
  source_id UUID,
  event_id TEXT NOT NULL,
  external_id TEXT,
  value NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dispatch_status TEXT NOT NULL DEFAULT 'pending' CHECK (dispatch_status IN ('pending', 'dispatched', 'failed')),
  dispatch_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_conversion_events_event_id_name
  ON public.meta_conversion_events(event_name, event_id);

CREATE OR REPLACE FUNCTION public.enqueue_meta_conversion_event(
  p_event_name TEXT,
  p_source_type TEXT,
  p_source_table TEXT,
  p_source_id UUID,
  p_event_id TEXT,
  p_external_id TEXT,
  p_value NUMERIC,
  p_currency TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.meta_conversion_events (
    event_name,
    source_type,
    source_table,
    source_id,
    event_id,
    external_id,
    value,
    currency,
    payload
  )
  VALUES (
    p_event_name,
    p_source_type,
    p_source_table,
    p_source_id,
    p_event_id,
    p_external_id,
    p_value,
    COALESCE(p_currency, 'USD'),
    COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (event_name, event_id) DO UPDATE
  SET
    external_id = EXCLUDED.external_id,
    value = EXCLUDED.value,
    currency = EXCLUDED.currency,
    payload = EXCLUDED.payload,
    dispatch_status = 'pending',
    dispatch_error = NULL
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_dispatch_meta_event(p_meta_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event public.meta_conversion_events%ROWTYPE;
  v_url TEXT := 'https://slirphzzwcogdbkeicff.supabase.co/functions/v1/meta-conversion-handler';
  v_anon TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXJwaHp6d2NvZ2Ria2VpY2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDUzMzgsImV4cCI6MjA4NTAyMTMzOH0.44uwdZZxQZYmmHr9yUALGO4Vr6mJVaVfSQW_pzJ0uoI';
  v_headers JSONB;
  v_body JSONB;
BEGIN
  SELECT * INTO v_event
  FROM public.meta_conversion_events
  WHERE id = p_meta_event_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'apikey', v_anon,
    'Authorization', 'Bearer ' || v_anon
  );

  v_body := jsonb_build_object(
    'event_name', v_event.event_name,
    'event_id', v_event.event_id,
    'external_id', v_event.external_id,
    'value', v_event.value,
    'currency', v_event.currency,
    'source_type', v_event.source_type,
    'source_table', v_event.source_table,
    'source_id', v_event.source_id,
    'payload', v_event.payload
  );

  BEGIN
    IF EXISTS (
      SELECT 1
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'http_post' AND n.nspname = 'net'
    ) THEN
      EXECUTE 'SELECT net.http_post(url := $1, headers := $2, body := $3)'
      USING v_url, v_headers, v_body;

      UPDATE public.meta_conversion_events
      SET dispatch_status = 'dispatched', dispatched_at = now(), dispatch_error = NULL
      WHERE id = v_event.id;
    ELSE
      UPDATE public.meta_conversion_events
      SET dispatch_status = 'pending', dispatch_error = 'pg_net extension missing'
      WHERE id = v_event.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.meta_conversion_events
    SET dispatch_status = 'failed', dispatch_error = SQLERRM
    WHERE id = v_event.id;
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_completed_purchase_trips()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_event UUID;
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status::text, '') <> 'completed' THEN
    v_event := public.enqueue_meta_conversion_event(
      'Purchase',
      'ride',
      'trips',
      NEW.id,
      NEW.id::text,
      NEW.rider_id::text,
      COALESCE(NEW.fare_amount, 0),
      'USD',
      jsonb_build_object('status', NEW.status)
    );
    PERFORM public.try_dispatch_meta_event(v_event);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_completed_purchase_food_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_event UUID;
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status::text, '') <> 'completed' THEN
    v_event := public.enqueue_meta_conversion_event(
      'Purchase',
      'food_order',
      'food_orders',
      NEW.id,
      NEW.id::text,
      NEW.customer_id::text,
      COALESCE(NEW.total_amount, 0),
      'USD',
      jsonb_build_object('status', NEW.status)
    );
    PERFORM public.try_dispatch_meta_event(v_event);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_completed_purchase_store_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_event UUID;
BEGIN
  IF NEW.status = 'delivered' AND COALESCE(OLD.status::text, '') <> 'delivered' THEN
    v_event := public.enqueue_meta_conversion_event(
      'Purchase',
      'store_order',
      'store_orders',
      NEW.id,
      NEW.id::text,
      NEW.customer_id::text,
      COALESCE(NEW.total_cents, 0)::numeric / 100,
      'USD',
      jsonb_build_object('status', NEW.status)
    );
    PERFORM public.try_dispatch_meta_event(v_event);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_completed_purchase_truck_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_event UUID;
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status::text, '') <> 'completed' THEN
    v_event := public.enqueue_meta_conversion_event(
      'Purchase',
      'truck_sale',
      'truck_sales',
      NEW.id,
      NEW.id::text,
      NEW.customer_id::text,
      COALESCE(NEW.total_amount, 0),
      COALESCE(NEW.currency, 'USD'),
      jsonb_build_object('status', NEW.status)
    );
    PERFORM public.try_dispatch_meta_event(v_event);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.track_complete_registration_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_event UUID;
BEGIN
  v_event := public.enqueue_meta_conversion_event(
    'CompleteRegistration',
    'user',
    'profiles',
    NEW.id,
    NEW.user_id::text,
    NEW.user_id::text,
    NULL,
    'USD',
    jsonb_build_object('email', NEW.email)
  );
  PERFORM public.try_dispatch_meta_event(v_event);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meta_purchase_trips ON public.trips;
CREATE TRIGGER trg_meta_purchase_trips
AFTER UPDATE ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.track_completed_purchase_trips();

DROP TRIGGER IF EXISTS trg_meta_purchase_food_orders ON public.food_orders;
CREATE TRIGGER trg_meta_purchase_food_orders
AFTER UPDATE ON public.food_orders
FOR EACH ROW
EXECUTE FUNCTION public.track_completed_purchase_food_orders();

DROP TRIGGER IF EXISTS trg_meta_purchase_store_orders ON public.store_orders;
CREATE TRIGGER trg_meta_purchase_store_orders
AFTER UPDATE ON public.store_orders
FOR EACH ROW
EXECUTE FUNCTION public.track_completed_purchase_store_orders();

DROP TRIGGER IF EXISTS trg_meta_purchase_truck_sales ON public.truck_sales;
CREATE TRIGGER trg_meta_purchase_truck_sales
AFTER UPDATE ON public.truck_sales
FOR EACH ROW
EXECUTE FUNCTION public.track_completed_purchase_truck_sales();

DROP TRIGGER IF EXISTS trg_meta_complete_registration ON public.profiles;
CREATE TRIGGER trg_meta_complete_registration
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.track_complete_registration_profile();

-- Inventory deduction when truck sale completes
CREATE OR REPLACE FUNCTION public.apply_truck_sale_inventory_deduction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_item RECORD;
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status::text, '') <> 'completed' THEN
    FOR v_item IN
      SELECT tsi.product_id, tsi.quantity
      FROM public.truck_sale_items tsi
      WHERE tsi.sale_id = NEW.id
    LOOP
      UPDATE public.truck_inventory ti
      SET
        quantity = GREATEST(0, ti.quantity - v_item.quantity),
        updated_at = now()
      WHERE ti.store_id = NEW.store_id
        AND ti.driver_user_id = NEW.driver_user_id
        AND ti.truck_label = NEW.truck_label
        AND ti.product_id = v_item.product_id;

      UPDATE public.warehouse_inventory wi
      SET
        quantity = GREATEST(0, wi.quantity - v_item.quantity),
        updated_at = now()
      WHERE wi.store_id = NEW.store_id
        AND wi.product_id = v_item.product_id;
    END LOOP;

    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_truck_sale_inventory_deduction ON public.truck_sales;
CREATE TRIGGER trg_apply_truck_sale_inventory_deduction
BEFORE UPDATE ON public.truck_sales
FOR EACH ROW
EXECUTE FUNCTION public.apply_truck_sale_inventory_deduction();

-- updated_at maintenance
DROP TRIGGER IF EXISTS update_social_reel_links_updated_at ON public.social_reel_links;
CREATE TRIGGER update_social_reel_links_updated_at
BEFORE UPDATE ON public.social_reel_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_truck_sales_updated_at ON public.truck_sales;
CREATE TRIGGER update_truck_sales_updated_at
BEFORE UPDATE ON public.truck_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_payroll_configs_updated_at ON public.store_payroll_configs;
CREATE TRIGGER update_store_payroll_configs_updated_at
BEFORE UPDATE ON public.store_payroll_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_truck_inventory_updated_at ON public.truck_inventory;
CREATE TRIGGER update_truck_inventory_updated_at
BEFORE UPDATE ON public.truck_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_warehouse_inventory_updated_at ON public.warehouse_inventory;
CREATE TRIGGER update_warehouse_inventory_updated_at
BEFORE UPDATE ON public.warehouse_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
