
-- Store profiles for manual catalog stores (e.g. Cambodia)
CREATE TABLE public.store_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  market TEXT NOT NULL DEFAULT 'KH',
  category TEXT NOT NULL DEFAULT 'grocery',
  address TEXT,
  phone TEXT,
  hours TEXT,
  rating NUMERIC(2,1) DEFAULT 4.5,
  delivery_min INTEGER DEFAULT 45,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Manual product catalog
CREATE TABLE public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  category TEXT,
  brand TEXT,
  sku TEXT,
  in_stock BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_store_profiles_market ON public.store_profiles(market);
CREATE INDEX idx_store_profiles_slug ON public.store_profiles(slug);
CREATE INDEX idx_store_products_store ON public.store_products(store_id);
CREATE INDEX idx_store_products_category ON public.store_products(category);

-- RLS
ALTER TABLE public.store_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Public read access (these are store catalogs)
CREATE POLICY "Anyone can view active store profiles"
  ON public.store_profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Anyone can view in-stock products"
  ON public.store_products FOR SELECT
  USING (in_stock = true);
