-- Remove overly broad zivo_restaurants_select that exposes all columns to any authenticated user
-- The restaurants_public_read policy already handles public access with status='active' filter
-- Keep restaurants_public_read as it also grants owner and admin access
DROP POLICY IF EXISTS "zivo_restaurants_select" ON public.restaurants;

-- Tighten restaurants_public_read: for non-owners/non-admins, they should use the restaurants_public view
-- Keep the existing policy but it only exposes data to owners and admins for non-active restaurants
-- Active restaurants are readable but clients should use restaurants_public view for safe columns