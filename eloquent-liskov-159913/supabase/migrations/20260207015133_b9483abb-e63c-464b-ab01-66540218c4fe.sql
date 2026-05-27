-- Add is_suspended column to drivers table for soft-suspend functionality
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Create index for efficient querying of suspended drivers
CREATE INDEX IF NOT EXISTS idx_drivers_is_suspended ON public.drivers(is_suspended) WHERE is_suspended = true;

-- Add comment for documentation
COMMENT ON COLUMN public.drivers.is_suspended IS 'Soft-suspend flag allowing temporary driver suspension without changing verification status';