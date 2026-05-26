
-- Trip itineraries table
CREATE TABLE public.trip_itineraries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  cover_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'booked', 'completed', 'cancelled')),
  total_estimated_cost_cents INTEGER DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trip items (flights, hotels, cars, activities)
CREATE TABLE public.trip_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id UUID NOT NULL REFERENCES public.trip_itineraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('flight', 'hotel', 'car', 'activity', 'note')),
  title TEXT NOT NULL,
  description TEXT,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  location TEXT,
  estimated_cost_cents INTEGER DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  booking_reference TEXT,
  booking_url TEXT,
  provider_name TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'booked', 'confirmed', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_items ENABLE ROW LEVEL SECURITY;

-- RLS for itineraries
CREATE POLICY "Users can view own itineraries" ON public.trip_itineraries
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create own itineraries" ON public.trip_itineraries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own itineraries" ON public.trip_itineraries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own itineraries" ON public.trip_itineraries
  FOR DELETE USING (auth.uid() = user_id);

-- RLS for trip items
CREATE POLICY "Users can view own trip items" ON public.trip_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own trip items" ON public.trip_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trip items" ON public.trip_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trip items" ON public.trip_items
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_trip_itineraries_user ON public.trip_itineraries(user_id);
CREATE INDEX idx_trip_itineraries_share ON public.trip_itineraries(share_token);
CREATE INDEX idx_trip_items_itinerary ON public.trip_items(itinerary_id);

-- Updated_at triggers
CREATE TRIGGER update_trip_itineraries_updated_at
  BEFORE UPDATE ON public.trip_itineraries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_items_updated_at
  BEFORE UPDATE ON public.trip_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_itineraries TO authenticated;
GRANT SELECT ON public.trip_itineraries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_items TO authenticated;
