-- Packages & Bundles + Retail Products + Loyalty + Reviews.

-- ===== Packages =====
CREATE TABLE IF NOT EXISTS public.salon_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  bundle_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (bundle_price_cents >= 0),
  validity_days INTEGER CHECK (validity_days IS NULL OR (validity_days > 0 AND validity_days <= 730)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_packages_store_idx ON public.salon_packages (store_id, sort_order);

CREATE TABLE IF NOT EXISTS public.salon_package_services (
  package_id UUID NOT NULL REFERENCES public.salon_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.salon_services(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 100),
  PRIMARY KEY (package_id, service_id)
);

-- ===== Retail Products =====
CREATE TABLE IF NOT EXISTS public.salon_retail_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  sku TEXT CHECK (sku IS NULL OR char_length(sku) <= 40),
  brand TEXT CHECK (brand IS NULL OR char_length(brand) <= 60),
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_retail_store_idx ON public.salon_retail_products (store_id, sort_order);
CREATE INDEX IF NOT EXISTS salon_retail_low_stock_idx
  ON public.salon_retail_products (store_id) WHERE stock_quantity <= low_stock_threshold;

-- ===== Loyalty =====
CREATE TABLE IF NOT EXISTS public.salon_loyalty_settings (
  store_id UUID PRIMARY KEY REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  points_per_dollar NUMERIC(6, 2) NOT NULL DEFAULT 1 CHECK (points_per_dollar >= 0 AND points_per_dollar <= 100),
  redemption_value_cents_per_point INTEGER NOT NULL DEFAULT 1 CHECK (redemption_value_cents_per_point >= 0),
  welcome_points INTEGER NOT NULL DEFAULT 0 CHECK (welcome_points >= 0),
  birthday_points INTEGER NOT NULL DEFAULT 0 CHECK (birthday_points >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add a denormalized points balance to salon_clients.
ALTER TABLE public.salon_clients
  ADD COLUMN IF NOT EXISTS loyalty_points INTEGER NOT NULL DEFAULT 0
    CHECK (loyalty_points >= 0);

CREATE TABLE IF NOT EXISTS public.salon_loyalty_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.salon_clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('earn', 'redeem', 'adjust', 'expire')),
  points_delta INTEGER NOT NULL,
  reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 200),
  booking_id UUID REFERENCES public.salon_bookings(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_loyalty_events_client_idx
  ON public.salon_loyalty_events (client_id, created_at DESC);

-- ===== Reviews =====
CREATE TABLE IF NOT EXISTS public.salon_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.salon_bookings(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.salon_clients(id) ON DELETE SET NULL,
  stylist_id UUID REFERENCES public.salon_stylists(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  stylist_name TEXT,
  rating_stars INTEGER NOT NULL CHECK (rating_stars BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 1000),
  owner_response TEXT CHECK (owner_response IS NULL OR char_length(owner_response) <= 1000),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_reviews_store_idx ON public.salon_reviews (store_id, created_at DESC);

-- ===== Triggers =====
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'tg_salon_set_updated_at_generic') THEN
    CREATE FUNCTION public.tg_salon_set_updated_at_generic()
    RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $f$
    BEGIN NEW.updated_at = now(); RETURN NEW; END $f$;
  END IF;
END $$;

DROP TRIGGER IF EXISTS salon_packages_set_updated_at ON public.salon_packages;
CREATE TRIGGER salon_packages_set_updated_at BEFORE UPDATE ON public.salon_packages
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

DROP TRIGGER IF EXISTS salon_retail_set_updated_at ON public.salon_retail_products;
CREATE TRIGGER salon_retail_set_updated_at BEFORE UPDATE ON public.salon_retail_products
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

DROP TRIGGER IF EXISTS salon_loyalty_settings_set_updated_at ON public.salon_loyalty_settings;
CREATE TRIGGER salon_loyalty_settings_set_updated_at BEFORE UPDATE ON public.salon_loyalty_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

DROP TRIGGER IF EXISTS salon_reviews_set_updated_at ON public.salon_reviews;
CREATE TRIGGER salon_reviews_set_updated_at BEFORE UPDATE ON public.salon_reviews
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

-- Loyalty events: keep client balance in sync.
CREATE OR REPLACE FUNCTION public.tg_salon_loyalty_apply_delta()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  UPDATE public.salon_clients
    SET loyalty_points = GREATEST(0, loyalty_points + NEW.points_delta)
    WHERE id = NEW.client_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS salon_loyalty_events_apply ON public.salon_loyalty_events;
CREATE TRIGGER salon_loyalty_events_apply
  AFTER INSERT ON public.salon_loyalty_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_loyalty_apply_delta();

-- ===== RLS =====
ALTER TABLE public.salon_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_package_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_retail_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_loyalty_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_reviews ENABLE ROW LEVEL SECURITY;

-- Public read of active items for the customer site.
CREATE POLICY "Public can view active packages" ON public.salon_packages FOR SELECT TO anon, authenticated
  USING (is_active = true AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_packages.store_id AND sp.is_active = true));
CREATE POLICY "Public can view package services" ON public.salon_package_services FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.salon_packages p WHERE p.id = salon_package_services.package_id AND p.is_active = true));
CREATE POLICY "Public can view active retail" ON public.salon_retail_products FOR SELECT TO anon, authenticated
  USING (is_active = true AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_retail_products.store_id AND sp.is_active = true));
CREATE POLICY "Public can view visible reviews" ON public.salon_reviews FOR SELECT TO anon, authenticated
  USING (is_visible = true AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_reviews.store_id AND sp.is_active = true));

-- Owner / admin manage-all helpers
CREATE POLICY "Owners manage packages - all" ON public.salon_packages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_packages.store_id AND sp.owner_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_packages.store_id AND sp.owner_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Owners manage package services - all" ON public.salon_package_services FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.salon_packages p JOIN public.store_profiles sp ON sp.id = p.store_id WHERE p.id = salon_package_services.package_id AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.salon_packages p JOIN public.store_profiles sp ON sp.id = p.store_id WHERE p.id = salon_package_services.package_id AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))));

CREATE POLICY "Owners manage retail - all" ON public.salon_retail_products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_retail_products.store_id AND sp.owner_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_retail_products.store_id AND sp.owner_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Owners manage loyalty settings - all" ON public.salon_loyalty_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_loyalty_settings.store_id AND sp.owner_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_loyalty_settings.store_id AND sp.owner_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Owners manage loyalty events - all" ON public.salon_loyalty_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_loyalty_events.store_id AND sp.owner_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_loyalty_events.store_id AND sp.owner_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'));

CREATE POLICY "Owners manage reviews - all" ON public.salon_reviews FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_reviews.store_id AND sp.owner_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_reviews.store_id AND sp.owner_id = (SELECT auth.uid())) OR public.has_role((SELECT auth.uid()), 'admin'));
