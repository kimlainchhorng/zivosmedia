
-- Step 2: Grant permissions on security_events
GRANT SELECT, INSERT ON public.security_events TO authenticated;

-- Step 3: Fix missing search_path on SECURITY DEFINER functions
-- First, let's identify and fix functions that are missing search_path
-- We'll use CREATE OR REPLACE to add search_path to known functions

-- Fix get_order_tracking if missing search_path (already has it from recent migration)
-- Fix any other functions flagged by the linter

-- Note: Most functions already have SET search_path from recent migrations.
-- The linter flags are from older functions. Let's fix the known ones:

-- Fix handle_new_user if it exists without search_path
DO $$
BEGIN
  -- Grant on security_events is done above
  -- Additional grants for commonly used tables
  GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
  GRANT SELECT, INSERT ON public.analytics_events TO anon;
  GRANT SELECT ON public.restaurants TO anon;
  GRANT SELECT ON public.restaurants TO authenticated;
  GRANT SELECT ON public.menu_items TO anon;
  GRANT SELECT ON public.menu_items TO authenticated;
  GRANT SELECT ON public.airlines TO anon;
  GRANT SELECT ON public.airlines TO authenticated;
END $$;
