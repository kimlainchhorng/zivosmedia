
ALTER TABLE public.trips 
ADD COLUMN IF NOT EXISTS rider_rating integer,
ADD COLUMN IF NOT EXISTS rider_feedback text,
ADD COLUMN IF NOT EXISTS rating_categories jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rating_tags text[] DEFAULT '{}';

-- Add check constraints
ALTER TABLE public.trips ADD CONSTRAINT trips_rider_rating_check CHECK (rider_rating >= 1 AND rider_rating <= 5);
