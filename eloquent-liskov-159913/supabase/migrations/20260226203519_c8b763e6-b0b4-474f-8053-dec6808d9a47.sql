
-- Travel Deals table for curated/dynamic deal feed
CREATE TABLE public.travel_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'flights' CHECK (category IN ('flights', 'hotels', 'cars', 'packages')),
  origin TEXT,
  destination TEXT NOT NULL,
  destination_country TEXT,
  destination_flag TEXT,
  price_from NUMERIC(10,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  discount_percent INTEGER,
  deal_type TEXT NOT NULL DEFAULT 'seasonal' CHECK (deal_type IN ('flash', 'seasonal', 'member', 'last-minute', 'trending')),
  image_url TEXT,
  cta_url TEXT,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  search_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS (deals are public-facing, read by everyone)
ALTER TABLE public.travel_deals ENABLE ROW LEVEL SECURITY;

-- Public read policy - deals are visible to all
CREATE POLICY "Deals are publicly readable"
  ON public.travel_deals
  FOR SELECT
  USING (is_active = true);

-- Index for common queries
CREATE INDEX idx_travel_deals_active ON public.travel_deals (is_active, category, priority DESC);
CREATE INDEX idx_travel_deals_expires ON public.travel_deals (expires_at) WHERE is_active = true;

-- Updated_at trigger
CREATE TRIGGER update_travel_deals_updated_at
  BEFORE UPDATE ON public.travel_deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
