-- Create exchange_rates table for caching FX rates
CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL,
  rate DECIMAL(20, 8) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies 
  ON public.exchange_rates(base_currency, target_currency);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched 
  ON public.exchange_rates(fetched_at DESC);

-- Enable RLS
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

-- Allow public read access (rates are not sensitive)
CREATE POLICY "Exchange rates are publicly readable"
  ON public.exchange_rates
  FOR SELECT
  USING (true);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage exchange rates"
  ON public.exchange_rates
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');