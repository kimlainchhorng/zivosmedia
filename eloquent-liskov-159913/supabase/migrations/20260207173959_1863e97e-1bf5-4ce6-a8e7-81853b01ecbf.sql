-- Add ride_id column to support_tickets for ride-specific tickets
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS ride_id uuid REFERENCES public.trips(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_ride_id ON public.support_tickets(ride_id);