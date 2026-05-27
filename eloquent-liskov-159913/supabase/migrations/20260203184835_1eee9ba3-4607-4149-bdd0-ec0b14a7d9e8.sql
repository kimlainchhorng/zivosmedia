-- =============================================
-- ZIVO Admin Operations - Add new role types
-- =============================================

-- Add new admin role types to app_role enum
-- These must be committed first before being used
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';