-- =====================================================
-- SECURITY HARDENING: Profiles & Hotel Bookings Tables
-- Consolidate and strengthen RLS policies
-- =====================================================

-- =====================================================
-- PROFILES TABLE - Remove conflicting policies, keep strict ones
-- =====================================================

-- Drop any overly permissive or duplicate policies on profiles
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_owner_access" ON public.profiles;

-- Keep the consolidated final policies (already exist):
-- profiles_select_own_or_admin (SELECT, authenticated)
-- profiles_update_own (UPDATE, authenticated)  
-- profiles_insert_own (INSERT, authenticated)
-- profiles_delete_admin_only (DELETE, authenticated)

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too (extra security)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- =====================================================
-- HOTEL_BOOKINGS TABLE - Consolidate policies
-- =====================================================

-- Drop duplicate/overlapping policies
DROP POLICY IF EXISTS "Customers view own hotel bookings only" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Hotel owners can view property bookings" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Hotel owners can update booking status" ON public.hotel_bookings;
DROP POLICY IF EXISTS "Authenticated users can create hotel bookings" ON public.hotel_bookings;
DROP POLICY IF EXISTS "hotel_bookings_select" ON public.hotel_bookings;
DROP POLICY IF EXISTS "hotel_bookings_modify" ON public.hotel_bookings;
DROP POLICY IF EXISTS "hotel_bookings_restricted" ON public.hotel_bookings;
DROP POLICY IF EXISTS "hotel_bookings_participant_only" ON public.hotel_bookings;

-- Keep the consolidated final policies (already exist):
-- hotel_bookings_owner_select (SELECT, authenticated)
-- hotel_bookings_owner_update (UPDATE, authenticated)
-- hotel_bookings_owner_insert (INSERT, authenticated)
-- Admins can manage all hotel bookings (ALL, public with has_role check)

-- Ensure RLS is enabled
ALTER TABLE public.hotel_bookings ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner too
ALTER TABLE public.hotel_bookings FORCE ROW LEVEL SECURITY;

-- =====================================================
-- Additional sensitive tables - Ensure FORCE RLS
-- =====================================================

ALTER TABLE public.drivers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist FORCE ROW LEVEL SECURITY;
ALTER TABLE public.car_rentals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.food_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.trips FORCE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reservations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.security_events FORCE ROW LEVEL SECURITY;