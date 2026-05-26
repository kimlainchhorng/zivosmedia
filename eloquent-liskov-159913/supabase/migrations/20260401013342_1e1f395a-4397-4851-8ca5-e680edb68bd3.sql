-- Fix: Remove customer_locations from Realtime publication (correct syntax)
ALTER PUBLICATION supabase_realtime DROP TABLE public.customer_locations;