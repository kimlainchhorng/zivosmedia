-- Cache table for popular route prices from Duffel
CREATE TABLE IF NOT EXISTS public.popular_route_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_code text NOT NULL,
  destination_code text NOT NULL,
  origin_city text NOT NULL,
  destination_city text NOT NULL,
  lowest_price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  airline_name text,
  airline_code text,
  search_date text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '6 hours'),
  UNIQUE(origin_code, destination_code)
);

ALTER TABLE public.popular_route_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read popular route prices"
  ON public.popular_route_prices
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role can manage popular route prices"
  ON public.popular_route_prices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);